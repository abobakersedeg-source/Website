# Golf Cart GCC — Data Model

**Status:** Design v1.0 (to be transcribed into `prisma/schema.prisma` in Phase 03) · **Date:** 2026-10-28
**Engine:** PostgreSQL 16+ · **ORM:** Prisma

Conventions:
- PKs: `id` (bigint identity, internal) + `publicId` (prefixed ULID, exposed in URLs/APIs).
- Money: integer minor units (`amountMinor`) paired with ISO-4217 `currency`. Never floats.
- Timestamps: `createdAt` / `updatedAt` (timestamptz) on every table. Soft delete via `deletedAt` only where history matters (catalogue).
- i18n content pattern: paired `…En` / `…Ar` columns for short fields; long-form rich text may use translation rows to keep main tables narrow. Noted per table.

---

## 1. Entity Map by Module

```
 Catalog      Pricing        Inventory       Identity        Commerce
 Category     PriceList      Warehouse       User            Cart/CartItem
 Product      PricePoint     StockMovement   Address         Order/OrderItem
 ProductVar.  TaxRate        Reservation     Role/UserRole   Shipment
 Attribute    Promotion      StockLevel      AuditLog        Payment/Invoice

 Quotation        Service           CRM               CMS/Admin
 RfqRequest       Asset             Lead              Page/Block
 Quote            ServiceTicket     Activity          Banner
 QuoteLine        TicketNote        Note              Setting
                                    Assignment        OutboxMessage/EmailTemplate
```
Sessions handled by Auth.js (JWT strategy → no mandatory table; DB adapter optional later).

---

## 2. Catalog & Variants

### Category
| Field | Type | Notes |
|---|---|---|
| id / publicId | bigint / ulid | |
| parentId | FK Category, nullable | adjacency tree; depth ≤ 3 planned |
| slug | citext unique | Latin slug shared across locales (ADR-007) |
| nameEn / nameAr | varchar | paired short-field i18n |
| descriptionEn / descriptionAr | text nullable | |
| imageMediaId | FK Media nullable | |
| seoTitleEn/Ar, seoDescriptionEn/Ar | varchar | |
| sortOrder, isActive | int, bool | |

Seeded example categories (**generic taxonomy structure only, not invented business data**): Electric Golf Carts, Gas Golf Carts, Utility/Cargo Carts, Spare Parts & Accessories, Lithium Batteries, Chargers. Final taxonomy pending catalogue input from business.

### Product
| Field | Type | Notes |
|---|---|---|
| id/publicId, skuCode (internal), categoryId FK | | |
| brandName | varchar | manufacturer values supplied by business |
| nameEn/nameAr | varchar | |
| summaryEn/Ar, descriptionEn/Ar | text | future locales via ProductTranslation rows |
| media[] | FK Media (kind: GALLERY/HERO/DOC) | alt text per locale |
| status | enum DRAFT/ACTIVE/ARCHIVED | drives ISR revalidation |
| hazardousGoodsFlag | bool | battery shipping rules — details pending logistics input |
| specsJson | jsonb | key/value specs keyed by Attribute definitions |
| warrantyMonths | int nullable | value TBD from business |
| seo fields | | as Category |

### Attribute & AttributeValue
`Attribute(id, nameEn, nameAr, type: TEXT/NUMBER/SELECT/BOOLEAN, unit)`; `AttributeValue(id, attributeId, valueEn, valueAr)`; link `ProductAttribute(product, attribute, value?)`. Drives variant options and filters (seats, range km, top speed, payload, battery type, controller…).

### ProductVariant (sellable SKU)
| Field | Type | Notes |
|---|---|---|
| productId FK | | |
| code | varchar unique | customer-facing SKU |
| optionValuesJson | jsonb | e.g. `{seats:4, battery:"Lithium", colour:"White"}` validated against Attribute defs |
| barcode / hsCode | varchar nullable | customs codes for export provided by business |
| stockManaged | bool | parts vs carts |
| weightKg, dimsCm | numeric nullable | shipping calc; values from business |
| isActive | bool | |

Unique index `(productId, optionValuesJson hash)` prevents duplicate variants.

### Media
`id, storageKey, url, kind, width, height, altEn, altAr, focalX/Y, sizeBytes, contentType` — objects live in R2/S3; DB stores metadata only.

---

## 3. Pricing, Currency & Tax

### Market & Currency
- `Market(code SA/AE/KW/QA/BH/OM/EXPORT, countryIso2, defaultCurrencyId, vatSchemeId, enabled bool)` — activation per business rollout decision.
- `Currency(code, minorUnits)` — SAR/AED/USD among candidates; enablement list = business input.

### PriceList / PricePoint
- `PriceList(id, name, currencyId, marketId?, segment: RETAIL/B2B/FLEET/DEALER, validFrom, validTo, isActive)`
- `PricePoint(priceListId, variantId, amountMinor, compareAtAmountMinor?, minQty?)` — tiered fleet pricing via multiple lists + `minQty`.
- Runtime resolution order: user-specific list → segment+market list → global default → error (never show unpriced product silently). FX display conversion is *indicative only*; charge currency fixed at checkout from the active list.

### TaxRate
`(countryIso2, scheme: VAT/EXEMPT/ZERO, ratePercent numeric, validFrom, inclusive bool, registrationNumber nullable ←business)`. Statutory references (e.g. KSA/UAE VAT rates) will be entered as **config rows requiring finance confirmation**, not hard-coded truths.

### Promotion
`Promo(id, code?, type: PERCENT/FIXED/FREE_SHIP, scope, amountMinor/percent, marketIds[], startsAt, endsAt, stackable, usageLimit, perCustomerLimit)` + `PromoTarget(promo, variantId?/categoryId?)`.

---

## 4. Inventory

- `Warehouse(id, name, marketId, address…, isDefault, active)` — locations = business input.
- `StockLevel(warehouseId, variantId, quantityOnHand, quantityReserved, reorderPoint?, UNIQUE(warehouse,variant))`; available = onHand − reserved.
- `StockMovement(id, warehouseId, variantId, delta, reason: PURCHASE_IN/SALE_OUT/RESERVE/RELEASE/ADJUSTMENT/RETURN/RMA_TRANSFER, refType/refId, actorUserId, occurredAt)` — append-only ledger; StockLevel is a materialized current view rebuildable from it.
- `Reservation(cart/order line, qty, expiresAt)` — soft holds expire with cart/session TTL.
- Supplier/PurchaseOrder deferred (only if procurement managed in-app; ERP question open).

---

## 5. Customers, Auth & Administration

### User
`id, publicId, email (citext unique nullable), phoneE164 (unique nullable), passwordHash (nullable — SSO/OTP later), firstNameEn/Ar?, lastNameEn/Ar?, localePref, timezone, status ACTIVE/LOCKED/PENDING_VERIFICATION/DELETED, emailVerifiedAt, lastLoginAt`. Guest-checkout policy (anonymous contact record vs provisional user) flagged for business decision.

### Role & assignment
`Role(code: CUSTOMER, SALES, SERVICE_COORDINATOR, WAREHOUSE, CONTENT_EDITOR, ADMIN)`; `UserRole(userId, roleId, marketScope? nullable)` → RBAC with optional per-market staff scoping.

### Address
`userId FK, label, recipientEn/Ar, line1/line2, cityEn/Ar, emirateOrProvince, countryIso2, postalCode(nullable — optional in GCC), phone, isDefaultShipping/Billing, lat/lng nullable`.

### AuditLog
`actorUserId, action, entityType, entityId, beforeJson, afterJson, ip, ua, at` — written by admin mutation middleware.

---

## 6. Cart, Orders, Payments, Invoicing

### Cart
`id(publicId), userId?, guestToken?, marketId, currencyId, status OPEN/CONVERTED/ABANDONED, expiresAt` + `CartItem(cartId, variantId, qty, unitPriceSnapshotMinor)` — prices snapshotted at add-time, recalculated at checkout validation.

### Order
| Field | Notes |
|---|---|
| number | human `GC-YYMMDD-XXXX` + publicId |
| userId/contact | snapshot contact fields for guests |
| status | PENDING_PAYMENT → PAID → CONFIRMED → PREPARING → DISPATCHED/OUT_FOR_DELIVERY → DELIVERED; branches: CANCELLED, REFUNDED, PARTIALLY_REFUNDED |
| paymentStatus | UNPAID/AUTHORIZED/PAID/FAILED/REFUNDED/MANUAL_CONFIRMED |
| fulfilmentMode | DELIVERY/PICKUP/INSTALL_ONSITE (policy TBD) |
| amounts | subtotalMinor, discountMinor, shippingMinor, taxMinor, totalMinor, currency |
| quotedOrderId | nullable link back to accepted quote |
| addresses | ship/bill snapshots (jsonb copy for invoice immutability) |
| timeline | OrderEvent(orderId, type, dataJson, actor, at) |

`OrderItem(orderId, variantId?, productSnapshotJson(nameEn/Ar, sku, unitPrice, taxRateApplied), qty, lineDiscountMinor, taxMinor, fulfilledQty)`.

### Shipment
`orderId, method, carrier?, trackingUrl?, dispatchedAt, deliveredAt, proofMediaIds[]`.

### Payment
`orderId, provider: STRIPE/TELR/HYPERPAY/TAP/PAYTABS/COD/BANK_TRANSFER, intentRef, amountMinor, currency, status, gatewayResponseJson, refundedMinor` + `PaymentEvent(paymentId, providerEventId unique, type, payloadJson, receivedAt)` for webhook idempotency/replay.

### Invoice
`orderId, invoiceNumber (sequential per market series), issuedAt, sellerJson(VAT no ←business), buyerJson, linesJson, totalsJson, qrCodePlaceholder` — immutable PDF-generating record. ZATCA/e-invoicing integration explicitly deferred (regulatory + credential input needed).

---

## 7. Quotations (RFQ → Quote → Order)

- `RfqRequest(contact/company fields, market, interestProductId/categoryId, qtyEstimate, useCase: FLEET/RENTAL/RETAIL/DEALER, message, source: WEB/WHATSAPP/PHONE/EXPO, status NEW/QUALIFIED/DISMISSED→creates Lead)`
- `Quote(rfqId?, userId?, createdById(sales), number, currency, status DRAFT/SENT/VIEWED/ACCEPTED/DECLINED/EXPIRED, validUntil, notesEn/Ar, pdfMediaId)` + `QuoteLine(quoteId, variantId?, descriptionEn/Ar, qty, unitPriceMinor, discountMinor, taxMinor)`
- Conversion: accepted quote → Order draft with locked snapshot prices; `convertedOrderId` backlink.
- Delivery via email with signed single-use accept link (`tokenHash`).

---

## 8. Service Requests

- `Asset(id, ownerUserId?, variant/productModel?, serialNumber, purchaseDate, warrantyEndsAt, notes)` — auto-created from delivered orders or entered manually.
- `ServiceTicket(publicId, assetId?, walkInContactJson, userId?, type: MAINTENANCE/REPAIR/WARRANTY/INSPECTION/PARTS_ONLY, priority, issueSummaryEn/Ar, photosMediaIds[], preferredDateRange, addressSnapshot, status NEW/TRIAGED/ASSIGNED/SCHEDULED/IN_PROGRESS/AWAITING_PARTS/COMPLETED/CLOSED/CANCELLED, quotedCostMinor?, linkedOrderId? (parts), slaDueAt ←policy TBD)`
- `TicketNote(ticketId, authorUserId, body, visibility: INTERNAL/CUSTOMER)`; `TicketStatusHistory` timeline.
- Warranty eligibility: `Asset.warrantyEndsAt` + claim flag; warranty terms = business input.

---

## 9. CRM

- `Lead(source, contactJson, company?, market, assignedToUserId?, stage: NEW/CONTACTED/QUALIFIED/PROPOSAL(→Quote)/WON(→Order)/LOST, score?, expectedCloseAt)` — auto-created from RFQs, contact forms, service calls.
- `Activity(leadId?/accountId?, type: CALL/EMAIL/MEETING/NOTE/WA_MESSAGE, direction, summary, occurredAt, createdById)` — customer timeline.
- `Note(entityType, entityId, body, internal)`.
- Admin pipeline board groups Leads by stage; CSV export. External-CRM sync (HubSpot/Zoho) deliberately **not** assumed — revisit only if business mandates.

---

## 10. CMS / Settings / Notifications

- `Page(slug, type, blocks[])`; `Block(id, pageId, kind: HERO/CATEGORIES_GRID/RICH_TEXT/TESTIMONIAL/CONTACT_FORM, propsJson(i18n fields), sortOrder, published)`; `Banner(market, imageMediaId, href, startsAt/endsAt, placement)`.
- `Setting(key, group, valueJson, editedById)` — store name/legal info, contacts, social links, enabled markets/currencies/payment methods, numeral style, low-stock thresholds. All currently-unknown business values live here as empty-but-typed keys.
- `OutboxMessage(id, channel: EMAIL/WHATSAPP/SMS, templateKey, locale, toJson, payloadJson, status PENDING/SENT/FAILED, retryCount, sentAt)` — transactional outbox guarantees order events ⇒ notifications even when a provider is down.
- `EmailTemplate(key, locale, subject, bodyHtml)` — bilingual pairs per flow (order confirmed, quote sent, ticket status…).
- `TranslationTask(entityType, entityId, field, sourceLocale, targetLocale, status)` — powers the "needs translation" report.

---

## 11. Cross-cutting Rules

1. **Referential integrity:** FKs with `RESTRICT` on commerce records (orders/payments never cascade-delete); catalogue deletes are soft.
2. **Immutability:** Order/Quote/Invoice line prices are snapshots; changing a PricePoint never rewrites history.
3. **Uniqueness:** variant codes, category slugs, price-list membership `(list,variant,validFrom)`, webhook event ids, sequential invoice numbers per market series.
4. **Indexing plan:** product(status,categoryId), variant(productId), pricepoint(pricelist,variant), stocklevel(variant), order(userId,status,createdAt), lead(stage,assignedTo), outbox(status,createdAt).
5. **No invented data:** seed script marks all demo products/prices `isSample=true`; excluded from production. Real values arrive via admin import once business provides them.
6. **Prisma modelling note:** JSONB for flexible specs/snapshots; relational tables wherever querying/reporting is required (never query inside JSONB for core flows).

## 12. Migration Sequence (Phase 03 breakdown)

1. `0001_identity` (User, Role, Address, Setting, AuditLog)
2. `0002_catalog` (Category, Product, Attribute, Variant, Media)
3. `0003_pricing_inventory` (Market, Currency, PriceList, PricePoint, TaxRate, Warehouse, StockLevel, StockMovement, Reservation, Promo)
4. `0004_commerce` (Cart, Order, OrderItem, OrderEvent, Shipment, Payment, PaymentEvent, Invoice)
5. `0005_quotation_service` (RfqRequest, Quote, QuoteLine, Asset, ServiceTicket, TicketNote…)
6. `0006_crm_cms_notify` (Lead, Activity, Note, Page, Block, Banner, OutboxMessage, EmailTemplate, TranslationTask)

Each migration ships with a smoke test inserting/reading representative rows in both locales.
