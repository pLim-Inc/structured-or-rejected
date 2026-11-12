# Case data

The complete case of part 2 is built from one file. `alba.json` is the composite used in the article. `case-data.template.json` is the same shape, empty, for your own numbers.

```bash
npm run check-case -- case/alba.json            # sums, shares and the figures the article quotes
npm run check-case -- case/my-case.json         # the same for your data
```

## Before you fill it in

- **`label`** decides how the case may be described: `named` (the owner agreed to be named), `anonymised` (real numbers, alias names) or `composite` (illustrative).
- **`permission`** is required for `named` and `anonymised`: who approved the publication, and when. It is never printed.
- A real case can only be real up to today. The baseline is measured. The calendar and the targets are a plan until the dates pass.
- Rounded real numbers are still real. Round the values to hide scale if the owner asks, and say that they are rounded.

## Fields

| Field | Meaning |
| --- | --- |
| `asOf`, `method` | Day of the measurement and how it was taken: the exposure report, the file check, another extract |
| `group.erp`, `group.companyCodes` | Product and edition as licensed; number of company codes in scope |
| `group.paymentRun` | Frequency, weekday and typical number of payments in a run |
| `group.paymentFormat` | Message version in use, the year the format was built, and how it writes the address: `free-text lines`, `hybrid` or `structured` |
| `entities[]` | One row per legal entity: alias, tax domicile, last year's turnover in EUR million, VAT reporting (`SII`, `foral` or `none`), invoices issued per year |
| `banks[]` | One row per house bank: alias, channel, share of payment value in percent. The shares add up to 100 |
| `baseline.payees` | Payees paid in the last 12 months by verdict: `structured` (payable, no finding), `warnings` (payable with findings), `notPayable` |
| `baseline.valueMEUR` | The same split by value paid, in EUR million |
| `baseline.lastFile` | Creditor addresses in the most recent payment file, by format. The three formats add up to the total |
| `baseline.oneTimePayments12m` | Payments through one-time accounts in 12 months |
| `baseline.topNotPayable` | The largest payees that are not payable, and the value they hold. The article uses it for the first remediation wave |
| `calendar[]` | Date, event, and `law: true` when the date is set by law |
| `targets` | Payable value required before the pilot, and the address reject rate accepted after go-live, both in percent |

The checker derives which entities fall under VERI\*FACTU and from which date each one is under the B2B e-invoicing mandate. It applies the rules of part 1 and does not know about VAT groups: confirm the result with tax.
