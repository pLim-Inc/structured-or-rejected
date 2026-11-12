namespace compliance;

using { managed } from '@sap/cds/common';

type AddressFormat : String(12) enum { STRUCTURED; HYBRID; UNSTRUCTURED; MISSING; }

/** One row per payee address that payments actually use. */
entity PayeeAddresses : managed {
  key partner     : String(10);
  key addressId   : String(10);
      name        : String(140);
      street      : String(100);
      houseNumber : String(30);
      poBox       : String(30);
      postalCode  : String(30);
      city        : String(60);
      country     : String(3);
      freeText    : String(300);          // legacy lines, newline separated
      paidLast12m : Decimal(15, 2);       // exposure, used to prioritise the clean-up
      format      : AddressFormat;        // computed on every write
      payable     : Boolean;              // computed on every write
      issues      : String(1000);         // computed: comma-separated issue codes
}
