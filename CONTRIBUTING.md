# Contributing to Trove

Thanks for your interest! Trove is a community project and contributions of all sizes are welcome —
bug reports, new chains, new providers, docs, and tests.

## Getting set up

1. Install **Node.js 22** (20+ works).
2. Fork and clone the repo, then `npm install`.
3. Copy `.env.example` to `.env` and fill in a Discord token and at least one provider key (see the
   [README](README.md#-self-hosting)).
4. `npm run dev` to run with auto-reload.

## Before you open a pull request

Please make sure all of these pass:

```bash
npm run typecheck    # strict TypeScript, no errors
npm run lint         # eslint, no errors
npm test             # vitest, all green
npm run format       # prettier
```

CI runs the same checks plus a Docker build on every pull request.

## How the code is organized

The golden rule: **`core/` is pure and framework-free** (no Discord, ideally no surprise network
calls in pure logic), and the **`discord/` layer is thin**. New data logic belongs in `core/` with a
unit test; new presentation belongs in `discord/`. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full picture.

### Adding an EVM chain

Add one entry to `CHAINS` in `src/config/chains.ts` with the per-provider slugs the chain uses
(`alchemyNetwork`, `covalentChain`, `moralisChain`) and its CoinGecko / DefiLlama identifiers. A
provider automatically serves the chain when the matching slug is present — no other code changes.

### Adding a provider

1. Create `src/core/providers/<name>/client.ts` implementing the `WalletProvider` interface
   (and optionally `getDefi`).
2. Add a pure `mapper.ts` that turns the raw API response into the normalized model, and unit-test
   it with a captured sample (no live calls in tests).
3. Register it in `src/core/providers/router.ts`.

## Style & conventions

- TypeScript is **strict** (including `noUncheckedIndexedAccess`); prefer explicit, narrow types.
- Keep functions small and the data model normalized — providers must not leak vendor-specific shapes
  past their mapper.
- Tests must be **network-free** and deterministic. Capture a real API response and assert against it.
- Never commit secrets. `.env` is git-ignored; use `.env.example` to document new variables.

## Reporting bugs

Open an issue with the command you ran (with any address redacted if you prefer), what you expected,
and what happened. Logs from the bot console are very helpful.
