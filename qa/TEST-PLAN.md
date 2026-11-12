# QA test plan

Three questions: does the gate hold what the bank would reject, does the loop close from payment to status, and does each legal entity take exactly one tax track.

## Landscape

| Tier | S/4HANA | SAP BTP | Bank | Tax agency | E-invoicing |
| --- | --- | --- | --- | --- | --- |
| Development | Development system | Development subaccount | None: files are checked, not sent | None | None |
| Quality | Quality system | Test subaccount | Bank test channel, bank test accounts | Pre-production services | Platform sandbox, agency test environment |
| Production | Production system | Production subaccount | Live channel | Production services | Live |

Rules:

1. Quality never reaches a production endpoint. Re-point connections after every refresh from production, before any job runs.
2. Production holds no test entities and no test invoices.
3. Quality files go to the bank's test channel only.
4. Check that each agency test service is open before planning the cycle.

## Levels

| Level | Cases | Tool |
| --- | --- | --- |
| Unit | 17 | `npm test` |
| Integration | 4 | eDocument Cockpit logs, bank test channel |
| End to end | 21 | SAP's delivered test scripts as the base, plus the negative cases |
| Regression | 3 | The same scripts, run again |
| Performance | 1 | A copy of a real proposal |
| Operations | 5 | Alerts, roster, dashboard |

The catalogue is `test-cases.csv`. The column `automation` says who runs a case: `kit` (this repository), `sap` (start from SAP's delivered test script for the scope item) or `manual`.

## Address files

```bash
npm run qa:files     # writes qa/files/ADR-01.xml to ADR-12.xml
npm test             # every generated file must get the verdict in address-cases.json
```

Send all twelve files to the bank's test channel, including the six the gate holds, and record the bank's answer next to the gate's verdict.

- Gate passes, bank rejects: severity 1 defect in the gate.
- Gate holds, bank accepts: a note. The gate is stricter than this bank, today.

## Entry

- Transports in the quality system.
- Endpoints verified as test endpoints.
- Bank implementation guide and test accounts received.
- Test certificates installed.
- The twelve address cases created as business partners; a copy of last week's proposal available.

## Exit

- All 51 cases executed with evidence.
- No open defect of severity 1 or 2.
- Written confirmation of the new format from the bank.
- The agency's test services accepted every record type the entity uses.
- Sign-off from accounts payable, treasury, tax, master data and IT security.

## Severity

1. A payable invoice cannot be paid, a required record cannot be sent, or the gate passes what the bank rejects.
2. It works only with a manual workaround.
3. Everything else.

## Evidence for every end-to-end case

The file sent, the answer received, the document status in S/4HANA, the time.
