# VeloGo Advanced Customer Feature Suite

This extension adds an independent customer feature area at `/customer/feature-suite`.
The original ride booking, authentication, captain, admin, payment, corporate, support,
and subscription modules remain in place.

## Open the feature suite

1. Start the Spring Boot backend using the existing backend instructions.
2. Open a terminal in `frontend`.
3. Run `npm install` if dependencies are not installed.
4. Run `npm run dev`.
5. Sign in using a customer account.
6. Open **More Features** from the customer navigation and choose **Open advanced feature suite**.

You can also open `/customer/feature-suite` directly after signing in.

## Modules included

### 1. Scheduled rides

- Save a future pickup and destination.
- Select vehicle category, passenger count and reminder lead time.
- Validate that the requested time is in the future and within the 90-day planning window.
- Edit or cancel a saved plan.
- Filter saved plans by status and search by location.
- Export active plans to an `.ics` calendar file.

A saved plan is not an actual ride booking. Captain matching, notifications from the server,
and payment are not triggered by this prototype.

### 2. Multi-stop route planner

- Create a named route with pickup, intermediate waypoints and drop-off.
- Add, remove and reorder intermediate stops.
- Record a dwell time at each stop.
- Save routes and mark favorites.
- Enter approximate leg distances to calculate a planning estimate.

The distance estimator uses the distances entered by the user. It does not call the map-routing
provider and must not be treated as a navigation or fare quote.

### 3. Ride pooling interest board

- Publish a proposed shared commute.
- Specify origin, destination, departure time, vehicle, seats and contribution limit.
- Browse and filter requests.
- Request to join another local request.
- Review, accept or decline local interest records.
- Calculate a simple route/time compatibility score for demonstration.

This is not a real matching marketplace. It does not share records across accounts or devices,
verify identities, reserve seats, collect money or dispatch a vehicle.

### 4. Trip messages

- Open conversations by topic.
- Categorise messages as general, booking, payment, safety or lost-item questions.
- Add messages, use suggested prompts and mark a conversation resolved or reopened.
- Search and filter the inbox.

Messages remain in the current browser. No support agent receives these messages. Use the
existing support channel for real assistance, and use local emergency services for urgent danger.

### 5. Lost and found

- Submit an item report with category, description, last known location and contact phone.
- Generate a reference code for local tracking.
- Search and filter reports.
- Review report details and close or delete a local report.

The report does not notify a captain or support agent. For actual recovery, contact VeloGo through
the existing support workflow.

### 6. Rewards demonstration

- Show a points balance, lifetime points and a tier progress indicator.
- Browse a reward catalogue.
- Redeem demo rewards when enough points are available.
- Review earned and redeemed point transactions.
- Reset demo data.

Demo points and redemptions are not monetary value and do not issue a real coupon or wallet credit.
A production rewards system must calculate points on the backend from verified completed rides.

### 7. Trusted contacts

- Add up to ten trusted contacts.
- Validate phone numbers and prevent duplicate phone entries.
- Set one primary contact.
- Mark contacts as suggested for trip sharing.
- Search, filter, edit, copy and remove contact records.

Adding a contact does not send a message or share location. A production trip-sharing workflow
must request permission each time and provide an explicit stop-sharing action.

### 8. Travel analytics

- Read ride history using the existing ride-history API.
- Filter the report by all time, 30 days, 90 days or this year.
- Summarise completed rides, spend, distance, average fare and ride completion.
- Compare monthly spend, vehicle categories and common destinations.
- Export ride history to CSV.

The estimated time-saved value is illustrative, not a measured traffic or route result.

## Data storage and account separation

Optional feature records use versioned browser storage keys with the prefix
`velogo_feature_suite_v1`. The signed-in user ID is part of each key, so one account's local
records are not intentionally displayed to another account in the same browser profile.

The feature suite provides JSON backup and restore. Backups are account-specific and include a
schema version. Importing a backup replaces the current local feature records for that account.

This storage approach is suitable for a frontend demonstration. It is not a substitute for
server-side persistence, authorisation, audit logging, concurrency control or backups.

## New source files

- `frontend/src/features/featureModels.ts`
- `frontend/src/features/featureStorage.ts`
- `frontend/src/features/featureValidation.ts`
- `frontend/src/features/featureAlgorithms.ts`
- `frontend/src/features/featureCalendar.ts`
- `frontend/src/features/featureCsv.ts`
- `frontend/src/features/featureNotifications.ts`
- `frontend/src/features/FeatureSuitePage.tsx`
- `frontend/src/features/modules/`
- `frontend/src/features/__tests__/`

## Verification

Run the following commands from `frontend`:

```powershell
npm install
npm run build
npm test
```

The added tests cover validation, route and pooling algorithms, reward calculations, analytics,
calendar generation, reminder evaluation, CSV export and local storage backup/restore.

## Production integration roadmap

Before presenting the modules as production-ready, add authenticated Spring Boot endpoints and
relational tables for scheduled rides, saved routes, pooling requests, pooling interests,
conversations, lost-item reports, reward accounts, reward transactions and trusted contacts.

The backend should enforce ownership and role checks, validate all input again, rate-limit public
workflows, store sensitive information securely, and publish notifications through a trusted
notification service. For scheduled rides, implement a transactional scheduler and captain
matching workflow with idempotency and cancellation rules. For pooling, perform matching on the
server and do not expose personal contact details before acceptance. For rewards, use a ledger and
never trust client-submitted point balances. For analytics, calculate financial totals from
verified payment and ride records.
