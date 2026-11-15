import type { Atlas, AtlasSlot } from './atlas';
import type { Camera } from './camera';
import type { Point, Rect } from './rect';
import { compositeShader, effectShader, KIND } from './composite-shader';
import type { Effect } from './effects';

const FLOATS_PER_INSTANCE = 16;

/** Consecutive instances drawn with one effect's pipeline, or the plain one (`effect` null). */
interface Run {
  effect: Effect | null;
  start: number;
  count: number;
}

/**
 * Draws every visible node with instanced draw calls: one for the whole frame, or one per run of
 * nodes sharing an effect, in paint order. Each frame the caller lists its quads between `begin`
 * and `draw`. A quad is FLOATS_PER_INSTANCE floats: world rect, atlas texel rect (a ring's color),
 * then layer, kind and ring width or effect padding, then an effect's parameters.
 */
export class CompositeRenderer {
  private instances = new Float32Array(FLOATS_PER_INSTANCE * 4096);
  private count = 0;
  private readonly runs: Run[] = [];
  private instanceBuffer: GPUBuffer;
  private readonly uniforms: GPUBuffer;
  private readonly uniformData = new Float32Array(20);
  private readonly pipeline: GPURenderPipeline;
  private readonly bindGroup: GPUBindGroup;
  private readonly bindGroupLayout: GPUBindGroupLayout;
  private readonly sampler: GPUSampler;
  /** Effect pipelines, null while one compiles. Compiling never blocks a frame. */
  private readonly effects = new Map<Effect, GPURenderPipeline | null>();
  private readonly failed = new Set<Effect>();

  constructor(
    private readonly device: GPUDevice,
    private readonly context: GPUCanvasContext,
    private readonly format: GPUTextureFormat,
    private readonly atlas: Atlas,
    public background: [number, number, number, number],
    public placeholder: [number, number, number, number],
    /** Called when an effect pipeline is ready, so the caller can draw it. */
    private readonly onEffectReady: () => void,
  ) {
    this.bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {} },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { viewDimension: '2d-array' },
        },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      ],
    });
    this.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    this.pipeline = device.createRenderPipeline(
      this.pipelineDescriptor('gpucanvas composite', compositeShader),
    );
    this.uniforms = device.createBuffer({
      size: this.uniformData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.bindGroup = device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniforms } },
        { binding: 1, resource: atlas.view },
        { binding: 2, resource: this.sampler },
      ],
    });
    this.instanceBuffer = this.createInstanceBuffer();
  }

  private pipelineDescriptor(label: string, code: string): GPURenderPipelineDescriptor {
    const module = this.device.createShaderModule({ label, code });
    return {
      label,
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] }),
      vertex: {
        module,
        entryPoint: 'vs',
        buffers: [
          {
            arrayStride: FLOATS_PER_INSTANCE * 4,
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x4' },
              { shaderLocation: 1, offset: 16, format: 'float32x4' },
              { shaderLocation: 2, offset: 32, format: 'float32x4' },
              { shaderLocation: 3, offset: 48, format: 'float32x4' },
            ],
          },
        ],
      },
      fragment: {
        module,
        entryPoint: 'fs',
        targets: [
          {
            format: this.format,
            // Snapshots are requested premultiplied.
            blend: {
              color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
              alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
            },
          },
        ],
      },
      primitive: { topology: 'triangle-strip' },
    };
  }

  /** Whether `effect` can draw this frame. The first ask starts compiling it. */
  hasEffect(effect: Effect): boolean {
    if (this.effects.has(effect)) return this.effects.get(effect) !== null;
    this.effects.set(effect, null);
    this.device
      .createRenderPipelineAsync(
        this.pipelineDescriptor(`gpucanvas effect ${effect.name}`, effectShader(effect.wgsl)),
      )
      .then((pipeline) => {
        this.effects.set(effect, pipeline);
        this.onEffectReady();
      })
      .catch((error) => {
        this.failed.add(effect);
        console.error(`[gpucanvas] effect "${effect.name}" failed`, error);
      });
    return false;
  }

  /** Whether `effect`'s pipeline failed to compile; it never draws then. */
  effectFailed(effect: Effect) {
    return this.failed.has(effect);
  }

  /** Starts a frame's list of quads. */
  begin() {
    this.count = 0;
    this.runs.length = 0;
  }

  /** Room for the next quad, in the run of `effect`; returns its first float. */
  private next(effect: Effect | null) {
    if ((this.count + 1) * FLOATS_PER_INSTANCE > this.instances.length) {
      const larger = new Float32Array(this.instances.length * 2);
      larger.set(this.instances);
      this.instances = larger;
      this.instanceBuffer.destroy();
      this.instanceBuffer = this.createInstanceBuffer();
    }
    const last = this.runs.at(-1);
    if (last && last.effect === effect) last.count++;
    else this.runs.push({ effect, start: this.count, count: 1 });
    return this.count++ * FLOATS_PER_INSTANCE;
  }

  private writeRect(offset: number, rect: Rect) {
    const data = this.instances;
    data[offset] = rect.x;
    data[offset + 1] = rect.y;
    data[offset + 2] = rect.width;
    data[offset + 3] = rect.height;
  }

  private writeSlot(offset: number, slot: AtlasSlot) {
    const data = this.instances;
    this.atlas.touch(slot.layer);
    data[offset + 4] = slot.x;
    data[offset + 5] = slot.y;
    data[offset + 6] = slot.x + slot.width;
    data[offset + 7] = slot.y + slot.height;
    data[offset + 8] = slot.layer;
    data[offset + 9] = KIND.snapshot;
  }

  /** `rect` showing the snapshot in `slot`, or the placeholder color while there is none. */
  quad(rect: Rect, slot: AtlasSlot | null) {
    const offset = this.next(null);
    this.writeRect(offset, rect);
    if (slot) this.writeSlot(offset, slot);
    else this.instances[offset + 9] = KIND.placeholder;
    this.instances[offset + 10] = 0;
  }

  /** `rect` drawn through `effect` from the snapshot in `slot`, reaching `pad` past its edges. */
  effectQuad(rect: Rect, slot: AtlasSlot, effect: Effect, pad: number, params: readonly number[]) {
    const offset = this.next(effect);
    this.writeRect(offset, rect);
    this.writeSlot(offset, slot);
    this.instances[offset + 10] = pad;
    this.instances.set(params, offset + 12);
  }

  /** An outline `width` CSS pixels wide just outside `rect`, in a premultiplied color. */
  ring(rect: Rect, color: readonly number[], width: number) {
    const offset = this.next(null);
    this.writeRect(offset, rect);
    this.instances.set(color, offset + 4);
    this.instances[offset + 9] = KIND.ring;
    this.instances[offset + 10] = width;
  }

  /** Draws the quads listed since `begin`. */
  draw(
    camera: Camera,
    cssWidth: number,
    cssHeight: number,
    dpr: number,
    /** Seconds since start, pointer and press in world units, seconds since the press. */
    effects: { time: number; pointer: Point; press: Point; sincePress: number },
  ) {
    const { device, count, runs } = this;
    this.uniformData.set([
      cssWidth,
      cssHeight,
      camera.x,
      camera.y,
      camera.zoom,
      dpr,
      this.atlas.size,
      effects.time,
      ...this.placeholder,
      effects.pointer.x,
      effects.pointer.y,
      effects.press.x,
      effects.press.y,
      effects.sincePress,
    ]);
    device.queue.writeBuffer(this.uniforms, 0, this.uniformData);
    if (count > 0) {
      device.queue.writeBuffer(
        this.instanceBuffer,
        0,
        this.instances,
        0,
        count * FLOATS_PER_INSTANCE,
      );
    }
    const [r, g, b] = this.background;
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r, g, b, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
    if (count > 0) {
      pass.setBindGroup(0, this.bindGroup);
      pass.setVertexBuffer(0, this.instanceBuffer);
      let current: GPURenderPipeline | null = null;
      for (const run of runs) {
        const pipeline = (run.effect && this.effects.get(run.effect)) || this.pipeline;
        if (pipeline !== current) pass.setPipeline((current = pipeline));
        pass.draw(4, run.count, 0, run.start);
      }
    }
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  destroy() {
    this.instanceBuffer.destroy();
    this.uniforms.destroy();
  }

  private createInstanceBuffer() {
    return this.device.createBuffer({
      label: 'gpucanvas instances',
      size: this.instances.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
  }
}
