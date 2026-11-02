# VeloGo Expansion Modules — Developer Guide

This guide documents the additional customer-side modules introduced in the expansion package.
The existing booking, authentication, payment, captain, corporate and admin workflows remain
separate. The new pages are registered inside the existing customer feature suite.

## New feature areas

### Fare split calculator

The fare split calculator supports three calculation modes:

- Equal split: divides a total across all participants and allocates the final rounding paisa.
- Weighted split: assigns a share based on each participant's positive weight.
- Custom split: accepts a participant-specific amount and validates the total.
- Settlement suggestions: reduces positive and negative balances into direct transfers.
- CSV export: downloads participant shares, paid amounts and balances.

The calculator is a personal planning tool. It does not initiate UPI, card, wallet or cash
transactions and does not change official payment records.

### Eco impact tracker

The impact tracker stores a customer-entered journey label, date, distance and travel mode.
It estimates emissions using the factors declared in `extendedFeatureAlgorithms.ts`.
It also shows estimated avoided emissions against a fixed illustrative baseline.

The factor values are sample estimates, not a verified life-cycle assessment. They do not
include vehicle occupancy, fuel blend, electricity generation mix, maintenance, road conditions
or actual engine performance. Do not present these estimates as audited carbon credits.

### Accessibility profiles

Customers can create multiple reusable preference templates. A profile can hold a preferred
communication channel, language, pickup instructions and optional assistance preferences.
Only one profile is intended to be the default at a time.

Profiles remain in local browser storage. They are not automatically attached to a ride, sent
to a captain or shared with support. Users should avoid storing medical histories, passwords,
one-time codes, access codes or other sensitive details in free-text fields.

### Recurring commute planner

A commute plan stores an origin, destination, repeat weekdays, start and end dates, departure
time, preferred vehicle and estimated one-way budget. It can be paused and resumed.

The monthly estimate is a planning approximation based on a bounded set of expected service
days. It is not a fare quote and does not automatically create scheduled ride bookings.

### Personal travel record vault

Customers can create personal expense notes for trips and export them as CSV or text. Records
can be searched, tagged and marked as favorites.

These notes are not official VeloGo invoices, tax documents, payment confirmations or evidence
that a payment was successfully captured. Customers should use the payment history and official
receipts for verified transaction information.

### Trip checklists

A checklist can be created from the starter items, extended with custom tasks, duplicated,
archived and restored. Required tasks are surfaced separately from optional tasks.

The checklist does not validate legal travel documents, booking status or other external facts.
It is a personal preparation aid only.

### Vehicle comparison workspace

Customers can enter their own fare, duration, capacity, comfort and emissions estimates for
several vehicle options. The ranking function applies weights to the customer's selected priority.

The ranking is deterministic for the entered data. It does not call a live pricing service,
dispatch service, map provider or availability endpoint. Availability percentages are user
estimates and should not be interpreted as live supply.

### Travel budget planner

The budget planner creates a monthly limit for a category and records customer-entered expenses.
It calculates remaining budget and warning states. A category/month pair is limited to one active
budget in the current prototype.

The totals are only as complete as the expenses the customer enters. They are not reconciled
against ride history or payment records.

### Favorite locations

Customers can save named locations, categories, landmarks and optional contact numbers. A
location can be marked as the default pickup or drop-off and its address can be copied.

Saved locations do not geocode the address, verify the location, or automatically populate a
booking form. Contact numbers and addresses are personal data; do not publish sample data.

### Personal trip check-ins

The check-in module records an expected arrival time, destination and trusted contact details.
Customers can manually mark a trip safe, request a follow-up or close the record.

This module is not a live safety service. It does not track GPS, send an alert to the contact,
detect missed arrivals or replace emergency services. The contact action opens the device's
phone handler only after the customer presses the call button.

### Group trip organizer

A group trip workspace records a destination, date range, member labels, confirmation states,
tasks and an indicative per-person budget. Members and tasks can be edited during planning.

This prototype does not invite user accounts, send group messages, collect contributions,
reserve seats or create a pooled ride. Names are labels entered by the signed-in customer.

### Airport transfer planner

The airport planner stores airport and terminal details, flight number, flight time, transfer
origin/destination, passenger count, luggage level and pickup time. It can calculate a
suggested pickup time from an explicitly chosen planning buffer.

The planner does not query airline systems, airport operations, live flight status, traffic,
weather or vehicle supply. Users must independently verify the actual flight time and pickup
arrangements.

### Ride reminder center

Customers can create reminders for booking, payment, documents or personal tasks. They can
mark reminders done, dismiss them or snooze them.

The current page evaluates reminder status when it is opened. It does not run a background
scheduler or guarantee a browser, email or SMS notification. A production scheduler should run
on the backend and use idempotent delivery records.

## Source layout

The expansion code is grouped by responsibility:

| Path | Responsibility |
| --- | --- |
| `extendedFeatureStore.ts` | Versioned local persistence, audit trail, backup and restore |
| `extendedFeatureAlgorithms.ts` | Fare splits, emission estimates, commute dates and rankings |
| `extendedFeatureValidation.ts` | Pure input validation and safe text helpers |
| `extendedFeatureDates.ts` | Local calendar operations |
| `extendedFeatureInsights.ts` | Aggregations for customer dashboards |
| `extendedFeatureReminderEngine.ts` | Reminder evaluation and quiet-hour rules |
| `extendedFeatureReports.ts` | CSV, JSON, text and printable report exports |
| `extendedFeaturePrivacy.ts` | Masking, free-text review and retention reminders |
| `extendedFeatureTemplates.ts` | Starter checklist and commute templates |
| `extendedFeaturePlanning.ts` | Shared planning calculations |
| `modules/` | React pages for each customer workflow |
| `__tests__/` | Pure-function and storage tests |

## Local persistence design

New modules use `extendedFeatureStore.ts`. A key is namespaced by the signed-in user identifier
and collection name. This keeps local records separated between accounts in the same browser
profile. The storage layer provides:

- Record identifiers and version metadata.
- Collection read, write, append, update and delete helpers.
- A bounded audit log.
- Schema-versioned JSON backups.
- Account ownership checks when restoring a backup.
- Storage size summaries.
- A custom event so modules can refresh after a write.

The current local storage implementation is a prototype adapter. Browser local storage is not
encrypted, can be cleared by the user, is not shared between devices and is not authoritative.
Do not use it for payment state, dispatch state, identity verification or critical safety data.

## Backup and restore

The expanded backup is separate from the original feature-suite backup. Use the
**Backup & activity** section and select **Download expanded backup**. The file includes only
the expansion collections for the currently signed-in account.

Restoring an expanded backup replaces the records in the expansion collections. The UI checks
that the backup belongs to the current user and has a supported schema version before restoring.
Keep downloaded backups private because they may contain addresses, phone numbers and personal
travel notes.

## Verification commands

Run commands from the `frontend` directory:

```powershell
npm install
npm run build
npm test
```

The tests cover:
- Equal, weighted and custom fare allocation.
- Settlement transfer calculations.
- Emissions estimates and avoided-emissions calculations.
- Commute recurrence and budget calculations.
- Vehicle ranking.
- Date parsing, month boundaries and calendar grids.
- Text, phone, date, fare and budget validation.
- Monthly and category travel aggregations.
- Reminder lead times, quiet hours and idempotency keys.
- CSV formula-injection handling.
- Privacy masking and free-text review.
- Backup creation, account checks and restoration.
- Checklist templates and planning calculations.

## Suggested backend implementation

The modules are kept independent so the team can connect them gradually. A production rollout
should not simply move browser objects into a controller. Use explicit request/response DTOs,
ownership checks and server-side validation.

Suggested API resources:

| Resource | Example route | Main operations |
| --- | --- | --- |
| Fare splits | `/api/customer/fare-splits` | Create, list, update and close a split |
| Eco journeys | `/api/customer/eco-journeys` | Record and list journey estimates |
| Accessibility profiles | `/api/customer/accessibility-profiles` | CRUD and set default |
| Commute plans | `/api/customer/commute-plans` | Create, pause, resume and cancel |
| Personal travel records | `/api/customer/travel-records` | CRUD and export |
| Checklists | `/api/customer/trip-checklists` | CRUD and item completion |
| Vehicle comparisons | `/api/customer/vehicle-comparisons` | Save and retrieve estimates |
| Travel budgets | `/api/customer/travel-budgets` | Create budgets and expense entries |
| Favorite locations | `/api/customer/favorite-locations` | CRUD and set default |
| Safety check-ins | `/api/customer/safety-checkins` | Create and manually close |
| Group trips | `/api/customer/group-trips` | Create trip, manage members and tasks |
| Airport plans | `/api/customer/airport-plans` | Create and update plans |
| Reminders | `/api/customer/reminders` | Create, snooze and complete |

For each resource, the backend should:
1. Derive the customer identity from the authenticated principal.
2. Reject attempts to read or change another customer's records.
3. Validate all values independently of frontend validation.
4. Apply request-size and collection-size limits.
5. Store timestamps consistently and define the intended time zone.
6. Use transactions for multi-record operations.
7. Add audit entries for sensitive updates and deletions.
8. Avoid exposing phone numbers, precise locations or notes unnecessarily.
9. Add retention and deletion policies.
10. Test access control, validation and concurrent updates.

## Recommended delivery sequence

1. Review the customer feature suite with the team.
2. Run the frontend build and test suite on the team's supported Node version.
3. Test every module with a fresh account and with an existing account.
4. Review local backup and restore behaviour.
5. Connect one module at a time to Spring Boot.
6. Add database migrations only after the team agrees on entity ownership and schema names.
7. Add integration tests before describing any module as production-ready.

## Important scope boundary

This extension is intended to increase the breadth of the VeloGo customer experience and provide
demonstrable workflows. Several modules are local prototypes. A successful frontend interaction
does not prove that a captain was assigned, a ride was booked, a payment was collected, a trusted
contact was notified or an airport pickup was confirmed.
