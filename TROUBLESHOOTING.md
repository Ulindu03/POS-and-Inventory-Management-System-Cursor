# Troubleshooting — VoltZone POS

Common issues and fixes

1) RangeError: Invalid time value
- Cause: `date-fns.format` called with invalid Date.
- Fix: parse strings with `parseISO` and check `isValid()` before `format`. Example: `formatDate` helper in `SaleLookup.tsx`.

2) TypeError: can't access property 'map', sale.items is undefined
- Cause: backend returned sale without `items` or frontend assumed `sale.items` exists.
- Fix: use `(sale?.items || [])` when mapping and guard index access in handlers (e.g., `sale?.items?.[index]`).

3) TS errors accessing `.name` or `.sku` on `product`
- Cause: TypeScript types show `product` can be `ObjectId` or populated object.
- Fix: populate `items.product` before access or cast `(product as any).name` when safe.

4) Exchange slip shows missing item names
- Cause: server created `ExchangeSlip` without `name`/`sku` on slip items.
- Fix: server `createExchangeSlip` now populates and annotates items with `name` and `sku` so the client can display them.

Debugging tips
- Enable server-side console logs in `ReturnService.lookupSales` to print filter JSON for phone/invoice searches.
- Use front-end console and error boundary stack traces to locate component/file and line numbers.

If you hit a new error, attach the console screenshot and stack trace and I will patch the code defensively.
