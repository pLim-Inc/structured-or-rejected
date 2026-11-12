using { compliance } from '../db/schema';

service ReadinessService @(path: '/readiness') {

  entity PayeeAddresses as projection on compliance.PayeeAddresses;

  type FormatCount {
    format   : String;
    payees   : Integer;
    exposure : Decimal(15, 2);
  }

  /** Readiness by format, weighted by what you actually paid. */
  function summary()                                     returns array of FormatCount;

  /** <PstlAdr> fragment for one payee, or an error that says why it cannot be built. */
  function pstlAdr(partner : String, addressId : String) returns String;

  /** Classifies every postal address in a pain.001 file. */
  action   lintPaymentFile(xml : LargeString)            returns String;
}
