# gpucanvas: guide for AI coding agents

Read this before changing anything. It applies to Claude Code, Codex, Cursor, Copilot and any
other agent working in this repository. Humans: [CONTRIBUTING.md](CONTRIBUTING.md) has the same
rules in short form.

## What this is

A library that puts live DOM nodes on an infinite canvas. Two backends share one API. `src/`:

- `index.ts`, `react.tsx`: the public entry points; public exports are only what these export.
  `types.ts` holds the public types.
- `core/`: what both backends start from. `base.ts` (surface, nodes, camera, input, queries),
  `camera.ts` and `rect.ts` (shared math), `input.ts` (pointer and wheel), `elements.ts`
  (elements inside nodes).
- `gpu/`: WebGPU draws the nodes through Chrome's HTML-in-Canvas (`drawElementImageToTexture`).
  - `backend.ts`: setup, the frame loop, compositing, the public methods
  - `plan.ts`: which visible nodes need pixels each frame
  - `raster.ts` and `capture.ts`: snapshots, tiles and captures into the atlas
  - `live.ts`: the node under the pointer, hit testing, pointer and focus
  - `pages.ts` and `page.ts`: the drawable pages nodes sit on; `shelves.ts` packs them and the atlas
  - `node.ts`: the node type shared by those files
  - `renderer.ts`, `composite-shader.ts`, `atlas.ts`: the GPU draw itself
- `dom/backend.ts`: the same nodes as plain positioned DOM, for every other browser.
- `editor/`: selection, move and resize (`editor.ts`), its chrome (`overlay.ts`), snapping and
  layers.
- `features/`: effects, transitions, snapshots, marks and the agent view, on top of either
  backend.

`demo/` is the site at https://berkantay.github.io/gpucanvas and is not published to npm. Its
mock screens live in `demo/screens/` (one file per screen, `desktop/` and `phone/`), and its
component kit in `demo/ui/`.

## Commands

```sh
bun install
bun run dev         # demo at http://localhost:5199/?mode=gpu  (mode: auto | gpu | dom)
bun run typecheck
bun run build
npx prettier --check src demo
```

There is no test suite yet. Typecheck, build and Prettier must pass, and you check behavior in a
browser (below).

## Rules

1. **Keep the public API stable.** Do not rename, remove or change the type of anything exported
   from `src/index.ts` or `src/react.tsx` unless the issue asks for it. New options are optional
   and change nothing for users who do not set them.
2. **No runtime dependencies.** The core has none. If a feature needs another library, take it as
   a function option (like a callback) so users plug in their own.
3. **Both backends.** A change to shared behavior works on the GPU path and the DOM path. If one
   backend cannot do something, say so in the type's doc comment and reject with a clear error.
4. **Small diffs.** One change per pull request. No drive-by refactors, renames or reformatting of
   code you did not need to touch.
5. **Comments explain why,** not what the next line does. No comments about history ("used to",
   "now", "after the refactor").
6. **Never commit** `dist/`, `.env` files, secrets, or generated screenshots.
7. **Don't invent numbers.** Performance claims in docs come from measured runs with the setup
   written next to them.

## Check it in a browser

Run `bun run dev` and open the demo in desktop Chrome 157+ with `?mode=gpu`, then again with
`?mode=dom`. Check what your change touches, for example:

- typing and clicking inside a node in Interact mode
- select, move and resize in Edit mode
- an effect from the effect menu, and `S` for a snapshot
- the browser console stays free of errors

Write in the pull request which of these you checked, in which browser and mode.

## Pull requests

Follow [CONTRIBUTING.md](CONTRIBUTING.md) and fill in the pull request template. Say that an agent
wrote the change and which one. A human opens the pull request and answers review comments.
