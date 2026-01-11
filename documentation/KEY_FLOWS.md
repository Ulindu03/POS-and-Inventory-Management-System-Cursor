# Key Flows — VoltZone POS

This file explains the main user flows and how they map to code.

1) Sale Lookup
- UI: `client/src/components/returns/SaleLookup.tsx` — collects invoiceNo, customerName or phone.
- API: `returnsApi.lookupSales` calls server endpoint.
- Server: `ReturnService.lookupSales(options)` builds filters, populates `customer` and `items.product`, and returns normalized sales with `items` and `returnSummary`.

2) Return Validation
- UI: `ReturnProcessor` builds `ReturnRequest` and calls validation endpoint.
- Server: `ReturnService.validateReturn` loads sale, applies policy, calculates available quantities and flags errors/warnings. Returns `{ valid, errors, warnings, requiresApproval, policy }`.

3) Process Return
- UI: user confirms; `returnsApi.processReturn` called.
- Server: `ReturnService.processReturn` runs validation, then uses MongoDB sessions to create `ReturnTransaction`, optionally `ExchangeSlip` or `CustomerOverpayment`, updates sale, adjusts inventory and logs stock movement.

4) Exchange Slip Creation & Preview
- Server: `createExchangeSlip` populates `items.product` and annotates slip items with `name` and `sku`.
- Client: `ReturnProcessor.openExchangeSlipPreview` uses slip payload to render printable HTML (shows item name, sku, qty, value).

Notes
- All critical writes happen in transactions to avoid partial state.
- The server ensures `items` array is always returned (even empty) to avoid UI crashes.
