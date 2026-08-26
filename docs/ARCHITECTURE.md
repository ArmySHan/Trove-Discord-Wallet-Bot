# Architecture

Trove separates a pure, framework-free **core** from a thin **Discord layer**. The core knows
nothing about Discord and can be unit-tested without the network; the Discord layer only handles
input, presentation, and interaction state.

```
Discord  ──/wallet──▶  command  ──▶  wallet service (cache)  ──▶  aggregator
                                                                     │
                          ┌──────────────────────────────────────────┤
                          ▼                  ▼                ▼        ▼
                   provider router      price client    token      DeFi
                   (per-chain,          (DefiLlama,    registry   (Moralis)
                    fail-over)           batched)     (CoinGecko)
```

## The flow of a `/wallet` request

1. **Resolve.** `core/ens` validates the input and detects its ecosystem (EVM, a UTXO chain —
   Bitcoin / Litecoin / Dogecoin / Bitcoin Cash — Solana, or TRON), resolving ENS names to an address.
2. **Pick chains.** An EVM address is queried across the default EVM chains; a UTXO, Solana or TRON
   address is routed to just its own network.
3. **Fetch (per chain, in parallel).** The **router** returns the configured providers that support
   the chain, in preference order. The aggregator tries them until one succeeds — so a provider
   outage or a chain a provider doesn't cover transparently falls through to the next. DeFi positions
   are fetched concurrently (best-effort) from a provider that supports them.
4. **Price.** Provider-supplied prices are kept; the **price client** fills only the gaps in one
   batched, keyless DefiLlama call.
5. **Classify.** Each token is marked verified/unverified against a reputable token list
   (**token registry**), and any provider spam flag is honored.
6. **Total.** Only native + verified, priced assets count toward the headline. Unverified-but-priced
   tokens and DeFi are summed separately and disclosed, never folded in.
7. **Render.** A summary embed plus stateless components; drilling into a chain pages through its
   full holdings.

## Key boundaries

### `WalletProvider`

The whole provider system is one small interface:

```ts
interface WalletProvider {
  readonly id: string;
  supports(chain: Chain): boolean;
  getBalances(address: string, chain: Chain): Promise<ChainPortfolio>;
  getDefi?(address: string, chain: Chain): Promise<DefiPosition[]>;
}
```

Each provider has a thin client (HTTP) and a **pure mapper** (raw JSON → normalized model). The
mapper is where the unit tests live; the rest of the system never sees vendor-specific shapes.

### The chain registry

`src/config/chains.ts` is the single source of truth for supported chains and the vendor identifiers
needed to query them (Alchemy/Covalent/Moralis slugs, CoinGecko platform, DefiLlama slug, ecosystem).
A provider serves a chain only if the matching slug is present, so coverage is **data-driven**.

### Honest valuation

Two rules keep the headline total trustworthy:

1. **Unpriced assets contribute nothing** — a wallet full of priceless spam shows no inflated value.
2. **Priced-but-unverified tokens are disclosed, not counted** — an airdropped token with a nominal
   market price (e.g. tens of millions of a junk coin) cannot pad the total.

DeFi is shown as an **estimate** outside the headline, because a protocol's reported position value
can itself include spam LP tokens.

### Ecosystem-aware addresses

EVM hex addresses are case-insensitive and lowercased for comparison; Solana base58 mints are
case-sensitive and kept verbatim. Pricing keys and token-list lookups both run through
`normalizeContract`, so the same code path serves all ecosystems correctly.

### Stateless interactions

Message components encode everything they need in their `customId`
(`w:<action>:<address>[:<chain>:<page>]`). Handlers re-derive the view from a shared cache and only
re-aggregate on a cache miss or an explicit refresh — there is no server-side session to keep.

## Resilience

- Per-chain fetches are **fail-soft**: one chain (or provider) failing marks the result `partial`
  rather than failing the whole command.
- Network calls share one `httpJson` helper with timeouts and retry/backoff on `429`/`5xx`, and it
  redacts API keys from logs.
- Results are cached briefly (TTL) so drill-down and pagination are instant and provider quotas are
  respected.
