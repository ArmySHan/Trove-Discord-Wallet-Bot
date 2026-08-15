# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-05

First public release.

### Added

- **`/wallet <address>`** — a wallet's on-chain portfolio from one slash command. Accepts an EVM
  address or ENS name, a Bitcoin / Litecoin / Dogecoin / Bitcoin Cash address, a Solana address, or a
  TRON address.
- **Many networks** — Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain and Avalanche, plus
  **Bitcoin, Litecoin, Dogecoin and Bitcoin Cash** (keyless public explorers), **Solana** (native
  SOL + SPL tokens), and **TRON** (TRX, TRC-20 incl. USDT, and staked TRX).
- **Honest totals** — the headline value counts only priced **and** verified assets. Airdrop spam
  with a nominal price is disclosed separately and never inflates the total.
- **DeFi positions** — lending, liquidity pools, staking and vaults shown per protocol as estimates.
- **Compact / detailed views** — replies open compact (total + one line per chain); a **Details**
  button expands the full breakdown.
- **Interactive drill-down** — a chain menu, **Prev / Next** pagination, **Refresh**, and stateless
  components (all view state lives in the customId).
- **`/watchlist add|remove|list`** and **`/portfolio`** — save addresses and see their combined
  value, persisted to a dependency-free JSON store.
- **`/help`** and **`/about`**.
- **Multiple providers with fail-over** — Alchemy, Covalent and Moralis behind one interface, chosen
  per chain in preference order; a failing provider transparently falls through to the next.
- Keyless batched pricing via DefiLlama; token verification against CoinGecko token lists.
- Self-hosting: `.env` config (validated on startup), Docker image + Compose, and GitHub Actions CI
  (format, lint, typecheck, test, Docker build).

[1.0.0]: https://github.com/YOUR-USERNAME/trove/releases/tag/v1.0.0
