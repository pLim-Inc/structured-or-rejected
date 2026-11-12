# Cutover and go-live runbook

Three go-lives, three behaviours: the payment format can be rehearsed and reversed, VERI*FACTU is forward only, and the B2B e-invoicing date is set by law.

## Ten rules

1. Sequence by dependency, not by deadline: data, then format, then volume.
2. One change per run.
3. Go live by bank and payment method.
4. The first production run is a pilot: twenty payments or fewer, low value, structured and hybrid, domestic plus one cross-border. Nothing else leaves in the new format until the status report says accepted and the statement shows the debits.
5. Stay away from month-end: no first run within three working days of a period close, no payroll or tax payment in the pilot batch.
6. Freeze what the test proved, from ten working days before the pilot. Single corrections continue through the gate.
7. Empty the pipe before the switch: no open proposal, no unapproved batch in the old format.
8. Rehearse the way back and time it. Named decision owner, written trigger.
9. Two people check endpoints and certificates.
10. No data is a no.

## Timeline (working days around the pilot run, day T)

| Day | Step |
| --- | --- |
| T-30 | First mock cutover in the quality system. Ask the bank for written confirmation |
| T-15 | Remediation waves closed. Payable value measured |
| T-10 | Second mock cutover with the fallback drill. Freeze starts |
| T-3 | Go or no-go meeting: `npm run go-no-go -- <status.json>` |
| T-2 | Transports imported. New format present, not yet assigned |
| T-1 | Pipe emptied. Snapshot of open items |
| T | Format assigned to the pilot payment method. Pilot batch sent. Status report received |
| T+1 | Statement books the debits. Release decision for the full run |
| T+5 | Full run |

## Go or no-go

The criteria, thresholds and owners are in `criteria.json`. Fill a status file like `status.sample.json` with measured values. A missing value fails.

## What can be undone

| Change | Undo | How | Decides |
| --- | --- | --- | --- |
| New payment format, per bank and payment method | Yes, while the bank accepts the previous format | Assign the previous format again, as rehearsed | Treasury lead |
| Gate at the proposal | Yes | Switch from hold to warn | Process owner |
| AI proposals | Yes | Switch them off; nothing was written without approval | Process owner |
| VERI*FACTU, per entity | No | Forward only: correct or cancel with a new record | Tax lead |
| B2B e-invoicing | No | The date is law. If the platform fails, issue through the form of the public solution | Tax lead |

## VERI*FACTU

- Decide on a date, against the official gazette of that day.
- Activate per entity at a period boundary.
- Ship the invoice layout (QR and legend) with the activation.
- The pilot is one real invoice, followed end to end: record created, list submitted, accepted, QR resolving.
- Watch the submission job from the first hour.

## B2B e-invoicing

- Receive before you issue.
- Finish the technical go-live before the legal date.
- Start the status clock on day one.
- Ask tax and the platform whether a voluntary early start is possible.

## Hypercare

- Two full payment cycles, one of them a month-end.
- Daily reject review at a fixed hour: every reject has a root cause and an owner by the end of the day.
- Watch: rejects for address reasons, holds at the gate per run, time from reject to fix, statuses sent inside the deadline.
- Exit: two consecutive cycles with address rejects below 0.1% of payments, no open severity 1 defect, runbook handed to support, reason-code map calibrated with each bank's real codes.

All thresholds and day counts are proposals. Calibrate them to your banks' cut-off times and to your own calendar.
