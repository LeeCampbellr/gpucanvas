# Contributing to gpucanvas

Thanks for helping. Bug reports, fixes, docs and new ideas are all welcome.
Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).

## Before you start

- **Bugs:** open an issue with the browser and version, `mode` (gpu or dom), what you did, what
  you expected and what happened. A link to a small repro helps the most.
- **Features and API changes:** open an issue first so we can agree on the shape before you write
  the code. Small fixes and docs can go straight to a pull request.

## Making a change

```sh
bun install
bun run dev         # demo at http://localhost:5199/?mode=gpu
```

Before you open the pull request:

1. `bun run typecheck` and `bun run build` pass.
2. `npx prettier --check src demo` passes.
3. You tried the change in the demo in desktop Chrome 157+ on both `?mode=gpu` and `?mode=dom`.

Keep each pull request to one change. Don't change exported names or types unless the issue asks
for it, and don't add runtime dependencies to the library. [AGENTS.md](AGENTS.md) has the full
rules and a map of the code.

## Using AI tools

AI-assisted pull requests are welcome. Please:

- say in the pull request that an AI tool wrote or helped write it, and which one
- read and understand every line before you open it: you are the author, and you answer the review
- run the checks and the browser test yourself, and write down what you checked
- don't open pull requests from an agent nobody is supervising, and don't send generated issues or
  comments

Pull requests that look unreviewed (unrelated changes, invented APIs, failing checks) get closed
with a short note. You're welcome to open them again once fixed.

## License

By contributing you agree that your contribution is licensed under the [MIT License](LICENSE).
