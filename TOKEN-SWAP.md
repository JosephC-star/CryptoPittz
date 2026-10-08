# PittzStop token swaps

Mainnet token IDs and decimals were checked against the MultiversX API and JEX token feed on October 7, 2026. The swap page supports a fixed curated list, searchable by name, symbol or exact ID.

| Token | Mainnet ID | Decimals |
| --- | --- | --- |
| EGLD | EGLD | 18 |
| BONEZ | BONEZ-ff9a73 | 6 |
| WEGLD | WEGLD-bd4d79 | 18 |
| MEX | MEX-455c57 | 18 |
| HTM | HTM-f51d55 | 18 |
| ONX | ONX-3e51c8 | 18 |
| XOXNO | XOXNO-c1293a | 18 |
| ZPAY | ZPAY-247875 | 18 |
| ASH | ASH-a642d1 | 18 |
| ITHEUM | ITHEUM-df6f26 | 18 |
| BOBER | BOBER-9eb764 | 18 |
| RIDE | RIDE-7d18e9 | 18 |
| ROAR | ROAR-e5185d | 10 |
| HODL | HODL-b8bd81 | 8 |
| REWARD | REWARD-cf6eac | 8 |

The original supplied HTM-f582f4, XOXNO-12a831, ZPAY-f22360, ASH-a642d4, ITHEUM-df6eb0 and BOBER-9f92ae returned Token not found. Their corrected IDs above match branded mainnet records in multiversx/mx-assets and JEX's token list.

Quotes are live and pair/amount dependent. A listed token does not guarantee a route to every other token. No-route responses never enable signing. EGLD and WEGLD represent the same routing asset: the direct EGLD ↔ WEGLD conversion requires wallet wrap/unwrap and is explicitly excluded from aggregator swaps.

Transactions are locally constructed for the pinned JEX router, with exact selected input/output token IDs, minimum output, checked route serialization, wallet balances and gas cap. Native EGLD wrapping/unwrapping gas is added only for native input/output. Every swap requires a successful unsigned network simulation before signing.

EGLD/WEGLD ↔ ASH uses a direct-route quote because the tested AshSwap multi-hop route failed unsigned simulation, while the direct xExchange route passed. Other token pairs keep the normal three-hop search.

ONX (OnionX / OOX) was verified against the MultiversX API on October 8, 2026. A live EGLD → ONX quote was available through JEX at the time of addition; all swaps still require the existing balance, route and simulation checks.
