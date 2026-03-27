# DOCFlow - Execution Plan

## Product framing

- Audience: startup CFO / founder
- Problem: idle treasury held in `DOC` on Rootstock earns nothing and is fragmented across wallet, balances, and DeFi actions
- Promise: connect Beexo, detect idle `DOC`, and guide allocation into Tropykus yield with a CFO-friendly dashboard
- Demo strategy: hybrid demo, as real as possible

## MVP scope for today

### Must be real

- Beexo connection through `XO Connect`
- Account detection
- Rootstock chain detection and switch attempt
- `DOC` balance read
- CFO dashboard states with real wallet/account data

### Can be hybrid

- Treasury policy suggestion: reserve vs idle cash
- APY panel and projected earnings
- Allocation confirmation state
- Post-deposit success state if live deposit is not validated in time

### Stretch goal

- Real `approve`
- Real Tropykus deposit / supply transaction

## Build order

1. Bootstrap separate app in this folder
2. Install and wire `xo-connect`
3. Implement connect wallet flow
4. Add Rootstock detection and switch flow
5. Read `DOC` balance through ERC-20 contract call
6. Build treasury overview UI
7. Build allocation flow and hybrid confirmation states
8. Validate whether `approve` is feasible today
9. Rebuild pitch deck and script around DOCFlow
10. Record backup demo

## Time blocks until 17:00

### Block 1 - Foundation (immediately)

- Create app skeleton
- Set routes/pages structure
- Add product naming, copy, and CFO framing
- Integrate `xo-connect`

Exit criteria:

- App runs locally
- Wallet connector button visible

### Block 2 - Real chain proof (highest priority)

- Connect Beexo wallet
- Detect account
- Detect current chain
- Attempt switch to Rootstock
- Show explicit connected / wrong network / ready states

Exit criteria:

- Real wallet can connect
- App can read and display account + chain state

### Block 3 - Treasury data proof

- Add Rootstock RPC-backed reads
- Read `DOC` token balance
- Show treasury cards: total balance, reserve, idle cash, projected monthly yield
- Add empty/error/loading states

Exit criteria:

- Connected wallet shows a believable treasury dashboard with real balance data

### Block 4 - Allocation flow

- Build amount input and allocation summary
- Show expected APY, projected return, and gas/risk note
- Add CTA `Deploy to Tropykus`
- If live tx is not ready, route to hybrid confirmation state with clear wording

Exit criteria:

- End-to-end product story can be shown in the UI

### Block 5 - Optional live transaction validation

- Validate `approve`
- If stable, validate deposit/supply call
- If unstable, freeze hybrid mode and do not keep pushing

Exit criteria:

- Either a real tx works, or the team intentionally locks a hybrid demo path

### Block 6 - Pitch package

- Create pitch slides
- Write 60-second and 3-minute scripts
- Prepare a backup recording of the happy path

Exit criteria:

- Pitch and demo are both runnable without improvising architecture decisions

## Non-negotiable principles

- Do not mix this project into `CosechaPay`
- Do not depend on the live Tropykus deposit for the whole demo to make sense
- Prioritize real wallet + real balance data over deeper protocol integration
- Freeze scope early if chain integration starts failing

## Success criteria

- A founder/CFO can understand the value in under 20 seconds
- The app shows real Beexo + Rootstock + `DOC` evidence
- The pitch explains why this matters for treasury, not speculation
- The demo still works even if the final deposit transaction is not executed live
