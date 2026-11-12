*&---------------------------------------------------------------------*
*& Report z_address_readiness
*&---------------------------------------------------------------------*
*& ISO 20022 address readiness, weighted by what was actually paid.
*& Classic tables (REGUH, LFA1, ADRC): on-premise and private cloud.
*& NOT executed for the article: validate in a sandbox client first.
*&---------------------------------------------------------------------*
REPORT z_address_readiness.

PARAMETERS p_days TYPE i DEFAULT 365.

START-OF-SELECTION.
  DATA(lv_from) = CONV laufd( sy-datum - p_days ).

  " Suppliers paid in the period: address verdict and amount at stake.
  SELECT FROM reguh AS p
         INNER JOIN lfa1 AS v ON v~lifnr = p~lifnr
         INNER JOIN adrc AS a ON a~addrnumber = v~adrnr
                             AND a~nation     = @space
                             AND a~date_to    = '99991231'
    FIELDS p~zbukr                              AS paying_company_code,
           v~lifnr                              AS supplier,
           a~street, a~house_num1, a~post_code1, a~city1, a~country,
           CASE WHEN a~city1 = @space OR a~country = @space        THEN 'UNSTRUCTURED'
                WHEN a~street <> @space AND a~house_num1 = @space  THEN 'REVIEW'
                ELSE 'STRUCTURED' END           AS verdict,
           ABS( SUM( p~rbetr ) )                AS paid_local_currency
    WHERE p~xvorl  = @space          " executed runs, not proposals
      AND p~laufd >= @lv_from
      AND p~lifnr <> @space
    GROUP BY p~zbukr, v~lifnr, a~street, a~house_num1, a~post_code1, a~city1, a~country
    ORDER BY paid_local_currency DESCENDING
    INTO TABLE @DATA(lt_readiness).

  cl_demo_output=>display( lt_readiness ).

" Notes
" - REVIEW means the street is filled and the house number is not: usually the
"   number was typed into the street field. Valid as hybrid, wrong as structured.
" - One-time vendors and alternative payees are not in LFA1. For those, read the
"   payee fields of the payment run itself (REGUH-ZNME1, ZSTRA, ZPSTL, ZORT1, ZLAND).
" - Amounts are in each paying company code's local currency: do not add across
"   company codes with different currencies.
" - S/4HANA Public Cloud: no direct table access. Build the same logic as a custom
"   CDS view on released views such as I_Supplier and I_Address_2.
