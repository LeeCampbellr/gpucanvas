import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { readdir, readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const directory = new URL('../dist/', import.meta.url);
const files = new Set((await readdir(directory)).filter((name) => name.endsWith('.js')));
const kind = process.argv.includes('--opacity')
  ? 'opacity'
  : process.argv.includes('--transform')
    ? 'transform'
    : 'color';
const quality = process.argv.includes('--adaptive') ? 'adaptive' : 'sharp';
const html = `<!doctype html><style>
html,body{margin:0}#host,#reference{position:absolute;top:0;width:600px;height:600px;overflow:hidden}#reference{left:600px}
@keyframes color{from{background-color:rgb(20,20,20)}to{background-color:rgb(230,230,230)}}
@keyframes opacity{from{opacity:.1}to{opacity:.9}}
@keyframes transform{from{transform:translateX(0)}to{transform:translateX(32px)}}
.pulse{width:96px;height:96px;animation:2000ms linear infinite alternate}
.color{animation-name:color}.opacity{animation-name:opacity;background:black}.transform{animation-name:transform;background:repeating-linear-gradient(90deg,#000 0px,#fff 32px)}
</style><div id="host"></div><div id="reference"><div id="world" style="transform-origin:0 0"><div id="native" style="position:absolute;left:80px;top:80px;width:320px;height:240px;background:white"><div class="pulse ${kind}"></div></div></div></div><script type="module">
import {createGpuCanvas} from '/index.js';
const canvas=await createGpuCanvas(document.getElementById('host'),{mode:'gpu',input:false,rasterQuality:'${quality}'});
const node=document.createElement('div');node.style.background='white';node.innerHTML='<div class="pulse ${kind}"></div>';
canvas.addNode(node,{x:80,y:80,width:320,height:240});canvas.setLiveNodes([node]);
window.fixture={canvas,node,world:document.getElementById('world'),native:document.querySelector('#native .pulse')};
</script>`;
const server = createServer(async (request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname.slice(1);
  if (!name) {
    response.setHeader('Content-Type', 'text/html');
    response.end(html);
    return;
  }
  if (!files.has(name)) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.setHeader('Content-Type', 'text/javascript');
  response.end(await readFile(new URL(name, directory)));
});
await new Promise((resolve) => server.listen(0, 'localhost', resolve));
const address = server.address();
assert(address && typeof address !== 'string');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({
  viewport: { width: 1200, height: 600 },
  deviceScaleFactor: 2,
});
const frames = (count) =>
  page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r));
  }, count);
async function sample(zoom, count) {
  const samples = [];
  for (let i = 0; i < count; i++) {
    const point = 128 * zoom;
    const png = await page.screenshot({
      clip: { x: 0, y: point, width: 1200, height: 2 },
      scale: 'css',
    });
    samples.push(
      await page.evaluate(
        async ({ png, x }) => {
          const image = new Image();
          image.src = 'data:image/png;base64,' + png;
          await image.decode();
          const reader = document.createElement('canvas');
          reader.width = image.width;
          reader.height = image.height;
          const context = reader.getContext('2d');
          assertContext(context);
          context.drawImage(image, 0, 0);
          function assertContext(value) {
            if (!value) throw new Error('Missing cadence pixel reader');
          }
          return {
            gpu: context.getImageData(Math.round(x), 0, 1, 1).data[0],
            native: context.getImageData(Math.round(600 + x), 0, 1, 1).data[0],
          };
        },
        { png: png.toString('base64'), x: point },
      ),
    );
  }
  return samples;
}
try {
  await page.goto('http://localhost:' + address.port);
  await page.waitForFunction(
    () =>
      window.fixture?.canvas.getStats().pending === 0 &&
      window.fixture.canvas.getStats().visible === 1,
  );
  const results = [];
  for (const zoom of [1, 0.5, 0.25]) {
    await page.evaluate((zoom) => {
      window.fixture.canvas.setCamera({ x: 0, y: 0, zoom });
      window.fixture.world.style.transform = 'scale(' + zoom + ')';
    }, zoom);
    await frames(30);
    await page.evaluate(() => {
      const f = window.fixture;
      f.node.querySelector('.pulse').getAnimations()[0].currentTime = 300;
      f.native.getAnimations()[0].currentTime = 300;
    });
    await frames(2);
    const samples = await sample(zoom, 12);
    results.push({
      zoom,
      distinctGpu: new Set(samples.map((v) => v.gpu)).size,
      distinctNative: new Set(samples.map((v) => v.native)).size,
    });
  }
  let transition;
  if (kind === 'color' && quality === 'sharp') {
    await page.evaluate(() => {
      const f = window.fixture;
      for (const e of [f.node.querySelector('.pulse'), f.native]) {
        e.style.animation = 'none';
        e.style.backgroundColor = 'rgb(20,20,20)';
        e.style.transition = 'background-color 180ms linear';
      }
    });
    await frames(30);
    await page.evaluate(() => {
      const f = window.fixture;
      for (const e of [f.node.querySelector('.pulse'), f.native])
        e.style.backgroundColor = 'rgb(230,230,230)';
    });
    const samples = await sample(0.25, 10);
    transition = {
      samples,
      gpuIntermediate: new Set(samples.map((v) => v.gpu).filter((v) => v > 30 && v < 220)).size,
      nativeIntermediate: new Set(samples.map((v) => v.native).filter((v) => v > 30 && v < 220))
        .size,
    };
  }
  console.log(JSON.stringify({ kind, quality, results, transition }, null, 2));
  for (const row of results) {
    assert(row.distinctNative >= 8, 'Native CSS control did not advance');
    if (quality === 'sharp' || row.zoom === 1)
      assert(
        row.distinctGpu >= row.distinctNative * 0.7,
        'Zoom throttled the presented CSS animation',
      );
    else assert(row.distinctGpu <= 4, 'Adaptive overview cadence unexpectedly changed');
  }
  if (transition) {
    assert(transition.nativeIntermediate >= 2, 'Native transition control did not advance');
    assert(transition.gpuIntermediate >= 2, 'A short transition lost its intermediate frames');
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
