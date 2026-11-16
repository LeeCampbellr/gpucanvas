# Experimental interaction hooks

Based on upstream gpucanvas 0.4.5 (dd25d1a154fdc704143637cdbac3bf1a6886d5af).
The original MIT license and attribution are retained. Core runtime dependencies
remain empty. No application source or application-specific behavior is included.

- `input: false` disables the built-in camera gesture listeners. Applications can
  drive `setCamera` while owning their input policy. The default stays enabled.
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
These changes were implemented with assistance from OpenAI GPT-6.1 Sol.
