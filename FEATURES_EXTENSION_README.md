# VeloGo – Additional Feature Extension

This extension adds a customer-facing **More Features** area while keeping the existing booking, customer, captain, admin, corporate, payment, subscription, safety and support modules in place.

## Added features

1. **Scheduled ride planner** – save a pickup, destination, vehicle preference, future date/time and note; cancel a saved plan.
2. **Multi-stop route planner** – build and save an itinerary with any number of stops.
3. **Ride-pooling interest** – post a proposed shared commute, date and seat count; cancel the request.
4. **In-app chat demo** – send messages in a local demo inbox and see an automated demo acknowledgement.
5. **Lost & found reports** – record a lost item, related ride, description and contact number.
6. **Rewards overview** – estimate points from completed ride spend and show a ride summary.
7. **Additional trusted contacts** – save and remove up to five extra contacts.
8. **Travel insights** – view completed ride count, distance, spend and recent completed rides from the existing customer ride-history API.

## Where to find it

Sign in with a customer account and choose **More Features** in the top navigation, or open `/customer/features`.

## Run the project

From the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). Run the backend as described in the original project README so that sign-in and the ride-history analytics can use the existing APIs.

## Important implementation note

This is an additive frontend extension. The existing backend APIs and database schema were intentionally left unchanged to avoid disrupting the team's current implementation. Scheduled plans, multi-stop itineraries, pooling-interest posts, demo chat messages, lost-item reports and the additional trusted contacts are currently saved in browser `localStorage`, scoped by the signed-in user ID. They are **prototype interactions**, not server-backed bookings, captain assignments, live passenger matching, staff support conversations, emergency dispatch or redeemable wallet credits.

The rewards view is an estimate (one point per ₹10 of completed-ride spend), not a real loyalty ledger. Travel insights read the existing ride-history API. Before production use, the prototype records should be moved to authenticated Spring Boot endpoints and database tables, with authorization, validation, audit history and operational workflows.

## Existing files changed

- `frontend/src/App.tsx` – registers the protected `/customer/features` route.
- `frontend/src/components/Navbar.tsx` – adds the More Features link for customer navigation.

## New file

- `frontend/src/pages/MoreFeaturesPage.tsx` – contains the eight feature panels and their UI interactions.
