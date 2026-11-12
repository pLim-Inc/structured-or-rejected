# Structured or Rejected: the kit

Companion code for the two-part article *Structured or Rejected*: part 1, the 2027–2028 compliance blueprint on SAP for ISO 20022 and VERI\*FACTU; part 2, from blueprint to go-live.

It measures how ready your payee addresses are for ISO 20022 structured and hybrid formats, lints real payment files, groups bank rejects by root cause, verifies a VERI\*FACTU record chain, and shows how to let a language model propose address splits without letting it decide. It also carries the delivery pack: a 51-case QA catalogue with generated test files, a status-deadline calculator and a go/no-go gate for cutover.

## What is tested and what is not

| Part | Status |
| --- | --- |
| `srv/lib/*.js`, the CAP service, the scripts | 45 tests pass on Node 22 with `@sap/cds` 9 and `@cap-js/sqlite` 2 |
| `qa/test-cases.csv` | 51 cases. The 17 marked `kit` run in `npm test`. The other 34 need an SAP system, a bank test channel or the tax agency's test services, and have not been executed |
| `srv/lib/verifactu.js` | Reproduces the worked example of the AEAT fingerprint specification |
| `genAiHubLlm()` in `srv/lib/ai-structurer.js` | Not executed: it needs an SAP AI Core binding. The guards around it are tested with a fake model |
| `abap/z_address_readiness.abap` | Not executed: validate in a sandbox client |

## Run it

```bash
npm install
npm test                                              # 45 tests
npm run lint:file -- samples/pain001-mixed.xml        # classify the addresses in a payment file
npx cds watch                                         # OData service at http://localhost:4004/readiness
npm run qa:files                                      # one pain.001.001.09 test file per address case, in qa/files
npm run go-no-go -- cutover/status.sample.json        # GO or NO-GO against cutover/criteria.json
npm run check-case -- case/alba.json                  # do the numbers of a case add up?
```

## What is in the box

| Path | Purpose |
| --- | --- |
| `srv/lib/address.js` | `classify()`, `toPstlAdr()`, `lintPain001()`: one rule set for master data, files and AI proposals |
| `srv/lib/pain002.js` | Reads a payment status report and groups rejects by root cause |
| `srv/lib/verifactu.js` | Recomputes SHA-256 fingerprints and finds where a record chain breaks. Audit only: it does not issue invoices |
| `srv/lib/ai-structurer.js` | AI proposes, rules decide, a person approves. Three guards, one adapter for the generative AI hub |
| `db/schema.cds`, `srv/readiness-service.*` | CAP service: verdict computed on every write, readiness by exposure, `<PstlAdr>` builder |
| `scripts/lint-payment-file.js` | Command-line linter for pain.001 files |
| `srv/lib/deadline.js` | `statusDueDate()`: four days after payment, not counting weekends and the national holidays you pass in |
| `qa/address-cases.json`, `scripts/generate-qa-files.js` | Twelve address cases and the generator that turns each into a payment file, negative cases included |
| `qa/test-cases.csv`, `qa/TEST-PLAN.md` | The 51-case catalogue and the plan around it: landscape, levels, entry, exit, evidence |
| `cutover/criteria.json`, `scripts/go-no-go.js` | Ten go/no-go criteria with thresholds and owners, and the script that evaluates a status file against them |
| `cutover/RUNBOOK.md` | Ten cutover rules, the timeline, what can be undone, hypercare |
| `case/alba.json`, `case/case-data.template.json`, `scripts/check-case.js` | The composite case of part 2 as data, an empty template for a real case, and the checker that verifies the sums and derives every percentage the article quotes |
| `abap/z_address_readiness.abap` | Exposure-weighted readiness from REGUH, LFA1 and ADRC |
| `samples/pain001-mixed.xml` | Synthetic file with a structured, a hybrid and an unstructured creditor |

## Figures

`figures/` holds the two covers and the 18 figures of the article as PNG. `figures-src/` holds the HTML and CSS they are rendered from, with `render.py` (Playwright, 2x). The drawings are original; they are not SAP's diagrams.

## Rules implemented

- Town name and country (ISO 3166-1 alpha-2) are mandatory for structured and hybrid addresses.
- A structured address carries no `<AdrLine>`.
- A hybrid address carries at most two `<AdrLine>` of at most 70 characters, and they must not repeat structured data.
- Maximum lengths: `StrtNm` 70, `BldgNb` 16, `PstBx` 16, `PstCd` 16, `TwnNm` 35.

Banks publish their own implementation guides. Treat this kit as a pre-check, not as your bank's validator.

## Limits

- The XML readers are dependency-free and tolerate namespace prefixes. They do not validate against the schema.
- The status-reason map in `pain002.js` is a starting point. Calibrate it against your own status reports.
- All sample names, addresses and account numbers are synthetic. Before a generated file goes to a bank's test channel, replace the debtor account and agent with the test account the bank gave you.
- The kit ships no holiday calendar and the thresholds in `cutover/criteria.json` are proposals. Set your own.

## Licence

MIT. Copyright (c) 2026 Marcio Sosim. See `LICENSE`.
