# Experimental interaction hooks

Based on upstream gpucanvas 0.6.0 (a45e1978d375ffaba7471aa13b867a0cc998f840).
The original MIT license and attribution are retained. Core runtime dependencies
remain empty. No application source or application-specific behavior is included.

- `input: false` disables built-in camera gestures and Tab navigation. Applications
  can drive `setCamera` while owning keyboard and pointer policy. By default, both
  remain enabled, and Tab follows insertion order independently of visual order.
- `setNodeOrder(elements)` moves the supplied nodes to the front in the supplied
  back-to-front order. Other nodes retain their relative order. It does not detach
  DOM, recreate nodes or discard focus/state; unknown nodes are rejected before
  changing order. Drawing, queries and native hit testing share the same order.
- `setLiveNodes(elements)` keeps the specified GPU nodes drawable and mapped for
  native focus, input, geometry and CSS animation. They are lifted into individual
  pages, because independently positioned nodes cannot share a native page transform.
  Passing `[]` releases the requested set; ordinary pointer/focus/transition holds
  still apply. The DOM backend is already live and needs no promotion.

Retain the visible working set and any offscreen node that owns an open overlay
or focused control, not the entire scene. Each live page adds browser layout/paint
work; performance must be measured with the intended live behavior enabled.
Repeated calls with the same set do not schedule additional GPU draws.

Build from source with `pnpm install --frozen-lockfile`, `pnpm typecheck`, and
`pnpm build`. Run `pnpm test:parity` in installed Chrome to check both backends.
The pinned Git dependency uses pnpm, matching its consuming toolchain rather than
requiring Bun to prepare the dependency.
Git consumers build the package via `prepare`; generated `dist` is not committed.
These changes were implemented with assistance from OpenAI GPT-6.1 Sol and GPT-6.2 Sol.

Retained nodes resize directly between drawable pages using state-preserving moves;
resizing must not blur an input or lose its current value. The browser fixture checks
this alongside ordering, focus return, cross-page Tab, animation, idle and release.

GPU backing-store dimensions follow CSS size × reported devicePixelRatio, matching
raster planning. Chrome's device-pixel-content-box ignores emulated DPR; relying on
it rendered 1× output in a 2× context. The browser fixture asserts backing-store
size before and after viewport resize so performance comparisons use equal density.

`rasterQuality: 'sharp'` upgrades visible detail during camera motion, does not accept
adaptive mode's 10% undersampling allowance, and renders animating previews at full
display resolution. Existing pixel/call/time budgets still bound raster work; sharp
does not promise that unlimited new content is instantly ready. The default remains
`adaptive`, preserving its settle delay and half-resolution animation previews.
The DOM backend already renders native pixels and ignores this option.

Run `pnpm test:zoom` for static and animating resolution targets compared with native
DOM at the same zoom/DPR. This catches visible softening that a zero pending count
alone cannot detect. A zoom-out which replaces tiles with a sufficiently sharp whole
snapshot is not a lost-detail event; the counter checks actual image density.

`flush()` consumes already queued GPU work in the embedding application's current
animation frame. Calling it after camera/layout changes avoids a second RAF delay
between native hit geometry/overlays and the composited picture. It preserves the
normal automatic scheduler for standalone callers, is a no-op when idle, and does
not add draws to an idle scene. DOM updates are already synchronous. The browser
fixture checks synchronous composition of a queued camera move and idle flushes.

Sharp camera motion uses a full-resolution capture of the visible region, reusing
its screen-sized atlas slot instead of allocating a new exact-scale tile grid on
every pinch frame. Static content returns to cached tiles when motion ends. If the
visible region cannot fit a layer at full resolution, sharp mode uses tiles rather
than shrinking the capture and leaving its outer edges blurry. `test:zoom` checks
both static and animating content at normal and oversized viewport widths.

Sharp quality preserves temporal cadence as well as spatial detail. It bypasses
adaptive mode's 250 ms refresh limit for nodes smaller than 200 on-screen CSS pixels.
CSS keyframes keep their own clock, duration and easing; they are not rewritten.
Only the deliberate size-based raster throttle is removed, not the global work
budgets. Adaptive overview behavior remains unchanged.

`pnpm test:animation` compares presented pixel samples against native DOM at 100%,
50% and 25% zoom for color, opacity and transform animations. It also checks that a
180 ms transition retains intermediate frames, and verifies adaptive mode remains
throttled. Spatial screenshots alone could not detect this temporal bug. The wide
contrast fixture captures the full viewport so its native reference is genuinely
outside the GPU surface rather than another region of that surface.
