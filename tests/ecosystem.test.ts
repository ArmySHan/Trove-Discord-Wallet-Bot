import { describe, expect, it } from 'vitest';
import { detectEcosystem, resolveInput } from '../src/core/ens/resolve';
import type { Env } from '../src/config/env';

describe('detectEcosystem', () => {
  it('classifies EVM, Bitcoin and unknown inputs', () => {
    expect(detectEcosystem('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toBe('evm');
    expect(detectEcosystem('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe('bitcoin');
    expect(detectEcosystem('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe('bitcoin');
    expect(detectEcosystem('not-an-address')).toBe('unknown');
  });

  it('classifies the new UTXO chains by their address formats', () => {
    // Litecoin: bech32 (ltc1…) and legacy M…/L…
    expect(detectEcosystem('ltc1qg9stkxrjsv9xkjxg3xqz0n9c0p2x4d3s8m6q7w')).toBe('litecoin');
    expect(detectEcosystem('MQd1fJwqBJvwLuyhr17PhEFx1swiqDbPQS')).toBe('litecoin');
    expect(detectEcosystem('LdP8Qox1VAhCzLJNqrr74YovaWYyNBUWvL')).toBe('litecoin');
    // Dogecoin: legacy D…
    expect(detectEcosystem('DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L')).toBe('dogecoin');
    // Bitcoin Cash: cashaddr with and without prefix
    expect(detectEcosystem('bitcoincash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy')).toBe(
      'bitcoin-cash',
    );
    expect(detectEcosystem('qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy')).toBe('bitcoin-cash');
  });

  it('classifies TRON (T… 34 chars) before Solana, and keeps real Solana addresses as Solana', () => {
    // Tron USDT contract + a Tron wallet — both 34-char base58 starting with 'T'.
    expect(detectEcosystem('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t')).toBe('tron');
    expect(detectEcosystem('TWd4WrZ9wn84f5x1hZhL4DHvk738ns5jwb')).toBe('tron');
    // 43–44 char Solana addresses must still resolve to Solana (the ordering guarantee).
    expect(detectEcosystem('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe('solana');
    expect(detectEcosystem('5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9')).toBe('solana');
  });
});

describe('resolveInput', () => {
  const env = {} as Env; // the bitcoin-cash path needs no RPC

  it('strips the bitcoincash: prefix so no colon enters the resolved address', async () => {
    const r = await resolveInput('bitcoincash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy', env);
    expect(r.ecosystem).toBe('bitcoin-cash');
    expect(r.address).toBe('qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy');
    expect(r.address).not.toContain(':'); // a colon would corrupt the component customId
  });
});
