# VeloGo — Complete Ride Booking & Bike Taxi Platform

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://www.oracle.com/java/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**VeloGo** is an original, production-ready, full-stack mobility platform inspired by the rapid on-demand experience of bike taxis and micro-mobility aggregators (such as Rapido). It features a dedicated customer ride booking experience, an interactive mobile-first driver/captain trip management cockpit, and a comprehensive real-time administrator governance portal.

---

## Table of Contents
1. [Platform Architecture](#platform-architecture)
2. [Technology Stack](#technology-stack)
3. [User Roles & Demo Credentials](#user-roles--demo-credentials)
4. [Ride Lifecycle State Machine](#ride-lifecycle-state-machine)
5. [Core Engines & Systems](#core-engines--systems)
   - [Matching & Dispatch Engine](#matching--dispatch-engine)
   - [Fare Calculation & Pricing Service](#fare-calculation--pricing-service)
   - [Map & Location Intelligence](#map--location-intelligence)
   - [Payments & Receipts](#payments--receipts)
   - [Real-Time STOMP WebSockets](#real-time-stomp-websockets)
6. [Project Structure](#project-structure)
7. [Getting Started (Local Zero-Config Mode)](#getting-started-local-zero-config-mode)
8. [Docker & Containerized Deployment](#docker--containerized-deployment)
9. [Automated Testing & E2E Validation](#automated-testing--e2e-validation)
10. [REST API & Swagger Documentation](#rest-api--swagger-documentation)
11. [Troubleshooting & FAQ](#troubleshooting--faq)

---

## 1. Platform Architecture

VeloGo is engineered as a clean **modular monolith** with strong separation of concerns, strict domain modeling, explicit DTO contracts, and zero frontend-trusted state transitions:

```
                      +------------------------------------+
                      |       VeloGo Single-Page App       |
                      |   React 19 + TypeScript + Leaflet  |
                      |     (Vite Dev / Nginx Gateway)     |
                      +-----------------+------------------+
                                        |
                         REST / JSON    |    STOMP / WebSocket
                         (Port 8080)    |    (/ws, SockJS)
                                        v
                      +------------------------------------+
                      |     Spring Boot 3.3.4 Monolith     |
                      |  Security (JWT) | Dispatch Engine  |
                      |  Fare Engine    | Payment Adapter  |
                      +-----------------+------------------+
                                        |
                 +----------------------+----------------------+
                 |                                             |
                 v                                             v
+---------------------------------+           +---------------------------------+
|        Primary Database         |           |       External Integrations     |
|  - Dev: Embedded H2 File DB     |           |  - OSRM / Haversine Routing     |
|  - Prod: PostgreSQL 16 PostGIS  |           |  - Razorpay Test / Dev Simulator|
|  - Flyway Versioned Migrations  |           |  - OpenStreetMap Tiles          |
+---------------------------------+           +---------------------------------+
```

---

## 2. Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript and Vite 8.
- **Styling**: Tailwind CSS v4 with custom VeloGo Warm Amber (`#f59e0b`) & Deep Navy (`#0f172a`) branding.
- **Mapping**: Leaflet 1.9 with OpenStreetMap tiles and custom SVG pins for Pickup, Drop, and Captain GPS navigation.
- **Real-Time Communication**: `@stomp/stompjs` and `sockjs-client` over WebSocket.
- **Routing & State**: React Router 7, TanStack Query v5, Context API (`AuthContext`, `SocketContext`).
- **Form Validation**: React Hook Form with Zod schemas.
- **Icons & Polish**: Lucide React icons, Canvas Confetti for ride celebrations.

### Backend
- **Framework**: Java 21, Spring Boot 3.3.4.
- **Security**: Spring Security 6 with stateless JWT Bearer token authentication (`io.jsonwebtoken 0.12.6`), BCrypt password hashing, and role guards (`ROLE_CUSTOMER`, `ROLE_CAPTAIN`, `ROLE_ADMIN`).
- **Data Persistence**: Spring Data JPA, Hibernate ORM 6.5, Flyway migrations (`db/migration/V1__initial_schema.sql`, `V2__seed_data.sql`).
- **Database Support**:
  - **Local Development**: Embedded file-based H2 database in PostgreSQL compatibility mode (zero Docker or local DB install needed).
  - **Production / Docker**: PostgreSQL 16 with PostGIS spatial extension.
- **WebSockets**: Spring WebSocket with STOMP message broker (`/topic/ride/{id}`, `/topic/captain/{id}/dispatch`, `/topic/user/{id}/notifications`).
- **Payment Gateway**: Razorpay Java SDK 1.4.5 with built-in development fallback simulator for automated testing.
- **Documentation**: Springdoc OpenAPI / Swagger UI 2.6.0.

---

## 3. User Roles & Demo Credentials

All test accounts are pre-seeded via Flyway migration `V2__seed_data.sql`. The default password for all seed accounts is:
```
password123
```

| Role | Account Name | Email | Phone | Status / Details |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | System Admin | `admin@velogo.com` | `+919999999999` | Superuser: metrics, captain verification, pricing, coupons |
| **Customer** | Arun Sharma | `customer@velogo.com` | `+919876543210` | 12 completed trips, 4.95 rating |
| **Customer** | Priya Kapoor | `priya.k@velogo.com` | `+919876543211` | 5 completed trips, 4.88 rating |
| **Captain (Bike)** | Rahul Verma | `captain.rahul@velogo.com` | `+919876543220` | **APPROVED** - Honda Activa 6G (`KA-01-EQ-1234`), 4.92 rating |
| **Captain (Auto)** | Suresh Gowda | `captain.suresh@velogo.com` | `+919876543221` | **APPROVED** - Bajaj Compact RE (`KA-03-FA-5678`), 4.85 rating |
| **Captain (Cab)** | Anand Kumar | `captain.anand@velogo.com` | `+919876543222` | **APPROVED** - Maruti Dzire (`KA-05-MM-9012`), 4.90 rating |
| **Captain (Pending)** | Vikram Rathore | `captain.vikram@velogo.com` | `+919876543223` | **PENDING** - Hero Splendor (`KA-04-AB-3456`) - for Admin review testing |

> **Convenience Feature**: The VeloGo Login page (`/login`) includes **1-Click Demo Buttons** (`Demo Passenger`, `Demo Captain`, `Demo Admin`) to autofill credentials instantly.

---

## 4. Ride Lifecycle State Machine

VeloGo enforces a rigorous, server-side state machine. State jumps, unauthorized role overrides, or forged completions are strictly rejected:

```
[Customer Books] 
       │
       ▼
   REQUESTED ──► SEARCHING (Nearby Captains Ranked & Dispatched)
                     │
                     ├─► (No Captain / Timeout) ──► EXPIRED
                     │
                     ▼ (Captain Accepts)
                  ACCEPTED
                     │
                     ▼ (Captain En Route)
                  ARRIVING
                     │
                     ▼ (Captain Arrives at Pickup)
                  ARRIVED
                     │
                     ▼ (Customer shares 4-Digit OTP; Captain submits OTP)
                IN_PROGRESS
                     │
                     ▼ (Destination Reached; Captain taps Complete)
                 COMPLETED
                     │
                     ▼ (Online Razorpay or Cash Settlement)
                   PAID ──► Customer Rates Captain (1-5 Stars)
```

---

## 5. Core Engines & Systems

### Matching & Dispatch Engine
- Dispatches only to **APPROVED**, **ONLINE**, and **AVAILABLE** captains matching the requested vehicle category (`BIKE`, `AUTO`, `CAB`).
- Calculates proximity via geographic coordinates (PostGIS or Haversine distance).
- Creates an expiring dispatch offer with a live **45-second countdown** on the Captain console.
- Employs database optimistic locking to ensure no two customers can be assigned the same captain concurrently.

### Fare Calculation & Pricing Service
- Formula:
  $$\text{Total Fare} = \max(\text{Base Fare} + (\text{Distance} \times \text{PerKm}) + (\text{Duration} \times \text{PerMin}) + \text{Booking Fee} + \text{Taxes} - \text{Discount}, \text{Min Fare})$$
- Configurable per category in the Admin Dashboard:
  - **Bike**: ₹25.00 Base, ₹9.00/km, ₹1.50/min, ₹5.00 Booking fee, 5% Tax.
  - **Auto**: ₹35.00 Base, ₹13.00/km, ₹2.00/min, ₹7.00 Booking fee, 5% Tax.
  - **Cab**: ₹60.00 Base, ₹19.00/km, ₹3.00/min, ₹15.00 Booking fee, 5% Tax.
- Pre-seeded promo coupons:
  - `VELO50`: 50% discount up to ₹50 on rides over ₹50.
  - `FIRSTGO`: 30% discount up to ₹100 on rides over ₹100.
  - `FREERIDE`: 100% discount up to ₹75 on rides over ₹50.

### Map & Location Intelligence
- Provider-agnostic routing interface (`RoutingService`).
- Queries the public Open Source Routing Machine (OSRM) for driving distances, road durations, and route polylines.
- Gracefully falls back to high-accuracy Haversine geometric road estimation if external routing networks are unreachable.

### Payments & Receipts
- **Cash on Completion**: Mark payment received upon arrival.
- **Razorpay Checkout**: Test mode integration with server-side signature verification (`HMAC-SHA256`).
- **Development Payment Simulator**: Automatically enabled when credentials are not configured, providing immediate, idempotent order creation, verification, and receipt rendering.
- **Tax Invoices**: Generates a downloadable, printable tax receipt modal detailing base fare, distance charge, booking fees, GST, and coupon discounts.

---

## 6. Project Structure

```
VeloGo/
├── backend/
│   ├── src/main/java/com/velogo/
│   │   ├── config/              # OpenApi & CORS configuration
│   │   ├── controller/          # REST endpoints (/api/v1/...)
│   │   ├── domain/              # JPA Entities (User, Ride, Payment, etc.)
│   │   ├── dto/                 # Type-safe Record DTOs
│   │   ├── exception/           # Global exception handler & error envelopes
│   │   ├── repository/          # Spring Data JPA Repositories
│   │   ├── security/            # JWT Token Provider, Auth Filter, UserDetails
│   │   ├── service/             # Ride, Fare, Dispatch, Payment, Admin logic
│   │   └── websocket/           # STOMP broker configuration & event publisher
│   ├── src/main/resources/
│   │   ├── application.yml      # Base Spring Boot configuration
│   │   ├── application-dev.yml  # Zero-config H2 dev profile
│   │   └── db/migration/        # Flyway schema (V1) & seed data (V2)
│   ├── Dockerfile               # Multi-stage Java 21 build
│   └── pom.xml                  # Maven dependencies & build plugins
├── frontend/
│   ├── src/
│   │   ├── components/          # Navbar, MapViewer, FareCard, RideStatusModal, etc.
│   │   ├── context/             # AuthContext, SocketContext
│   │   ├── pages/               # Landing, Booking, Captain, Admin, Safety, Auth
│   │   ├── services/            # Axios/Fetch API client with JWT interceptor
│   │   ├── types/               # TypeScript interfaces & enums
│   │   ├── App.tsx              # React Router definitions
│   │   └── index.css            # Tailwind v4 theme, Amber & Navy palettes
│   ├── nginx.conf               # Production SPA router & WebSocket proxy
│   ├── Dockerfile               # Production multi-stage Nginx container
│   ├── vite.config.ts           # Vite bundler & API proxy configuration
│   └── package.json
├── docker-compose.yml           # Complete containerized stack (Postgres + Backend + Frontend)
├── .env.example                 # Environment variables template
└── README.md                    # Project documentation
```

---

## 7. Getting Started (Local Zero-Config Mode)

VeloGo is designed to run locally right out of the box with **zero required external cloud keys or database setup**.

### Prerequisites
- **Java 21 JDK**
- **Maven 3.9+** (or use bundled wrapper)
- **Node.js 20+** and **npm**

### Step 1: Start the Backend (Port 8080)
Open PowerShell in the extracted `VeloGo-master` project root (the folder containing `backend`, `frontend`, and `docker-compose.yml`):
```powershell
cd backend
mvn spring-boot:run
```
- Flyway automatically initializes the embedded H2 database (`backend/data/velogodb.*`) and seeds demo accounts and fare rules.
- The backend listens at `http://localhost:8080`.
- Swagger UI: `http://localhost:8080/swagger-ui.html`.
- Health check: `http://localhost:8080/actuator/health`.

### Step 2: Start the Frontend (Port 5173)
Open a **second** PowerShell window. Navigate to the same extracted project root, then:
```powershell
cd frontend
npm install
npm run dev
```
- Open `http://localhost:5173`.
- The Vite development proxy forwards `/api` REST calls and `/ws` WebSocket traffic to `http://localhost:8080`.

**Important folder note:** If PowerShell already shows `...\\VeloGo-master>` in the prompt, you are already at the project root. Run `cd frontend`—do not run `cd VeloGo-master\\frontend` again. Run `npm install` only after entering the folder that contains `package.json`.

### Step 3: Confirm the connection
1. Keep both terminal windows running.
2. Open `http://localhost:8080/actuator/health`; the backend should return a JSON status of `UP`.
3. Open `http://localhost:5173` and use the demo login buttons. The frontend calls the backend through the Vite proxy.
4. Swagger documents the API at `http://localhost:8080/swagger-ui.html`.

---

## 8. Docker & Containerized Deployment

To launch the complete production stack (PostgreSQL + PostGIS, Backend, and Frontend behind Nginx):

```bash
# In the root repository directory:
docker-compose up --build
```

Services started:
- **`postgres`**: Port `5432` with PostGIS extension.
- **`backend`**: Port `8080` (Spring Boot production profile).
- **`frontend`**: Port `80` (Nginx serving optimized SPA static build and proxying `/api` & `/ws`).

Access the platform at:
- Web Application: `http://localhost/`
- Backend API & Swagger: `http://localhost/swagger-ui.html`

---

## 9. Automated Testing & E2E Validation

### 1. Backend Unit & Service Tests
Run JUnit 5 and Mockito tests for fare calculations, ride lifecycle, and security:
```bash
cd backend
mvn test
```

### 2. Frontend Unit & Component Tests
Run Vitest component tests:
```bash
cd frontend
npm run test
```

### 3. End-to-End API Lifecycle Suite
Run the automated 11-step Node.js integration script that tests the entire lifecycle from start to finish:
```bash
node scratch/e2e_api_test.mjs
```

**Verified Test Lifecycle Steps:**
1. **Fare Estimation**: Computes route distance, duration, and pricing breakdown for Bike, Auto, Cab.
2. **Customer Authentication**: Logs in `customer@velogo.com`, extracts JWT access token.
3. **Captain Authentication**: Logs in `captain.rahul@velogo.com` with vehicle verification.
4. **Admin Overview**: Fetches platform metrics, total customers, captains, and gross booking value.
5. **Ride Booking**: Customer initiates ride request (`SEARCHING`), generating secure 4-digit OTP.
6. **Captain Dispatch Acceptance**: Captain accepts incoming dispatch (`ACCEPTED`).
7. **Captain Pickup Arrival**: Captain reaches passenger pickup (`ARRIVED`).
8. **Trip Start with OTP**: Captain inputs customer's OTP (`IN_PROGRESS`).
9. **Trip Completion**: Destination reached, backend calculates final fare (`COMPLETED`).
10. **Payment Settlement**: Order created and verified with invoice generation (`SUCCESS`).
11. **Customer Review**: Customer rates captain 5 stars with feedback (`200 OK`).

---

## Cloud persistence for the extended feature suite

The ride-booking, authentication, captain, customer, payment, support, admin, and geo flows already use the Spring Boot REST API. The expanded feature suite also includes an account-scoped cloud data API:

- `GET /api/v1/features/data` — list the signed-in customer's saved feature records.
- `GET /api/v1/features/data?featureKey=feature-suite-backup` — list feature-suite backups.
- `POST /api/v1/features/data` — create a record.
- `GET /api/v1/features/data/{id}` — read one owned record.
- `PUT /api/v1/features/data/{id}` — update one owned record.
- `DELETE /api/v1/features/data/{id}` — delete one owned record.

All endpoints require a customer JWT. The server derives the owner from the authenticated principal; clients cannot submit another user's ID. Payloads are JSON documents capped at 100 KB. Flyway migration `V7__feature_suite_cloud_data.sql` creates the table and indexes.

The frontend exposes these endpoints through `api.features` in `frontend/src/services/api.ts`. `frontend/src/features/featureCloudSync.ts` provides explicit `saveFeatureSuiteToCloud(userId)` and `restoreFeatureSuiteFromCloud(userId)` helpers. Restore is an explicit action and validates the account ID before replacing local feature-suite records. Existing local feature modules remain usable offline; this cloud backup helper does not silently turn every module into always-on background sync.

## 10. REST API & Swagger Documentation

When the backend is running, access interactive OpenAPI documentation at:
- **Swagger UI**: `http://localhost:8080/swagger-ui.html`
- **OpenAPI JSON Spec**: `http://localhost:8080/v3/api-docs`

### Key Endpoint Groups:
- **Authentication**: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`
- **Customer**: `GET /api/v1/customers/me`, `GET /api/v1/customers/me/rides`
- **Ride Operations**: `POST /api/v1/rides/estimate`, `POST /api/v1/rides`, `GET /api/v1/rides/{id}`, `POST /api/v1/rides/{id}/cancel`
- **Captain Cockpit**: `PATCH /api/v1/captains/availability`, `POST /api/v1/captains/location`, `POST /api/v1/captains/requests/{id}/accept`, `POST /api/v1/captains/rides/{id}/arrive`, `POST /api/v1/captains/rides/{id}/start`, `POST /api/v1/captains/rides/{id}/complete`
- **Payments**: `POST /api/v1/payments/order`, `POST /api/v1/payments/verify`, `GET /api/v1/payments/{id}`
- **Admin Governance**: `GET /api/v1/admin/overview`, `GET /api/v1/admin/captains`, `PATCH /api/v1/admin/captains/{id}/verification`, `GET /api/v1/admin/pricing`, `PUT /api/v1/admin/pricing/{category}`, `POST /api/v1/admin/coupons`, `GET /api/v1/admin/audit-logs`
- **Support & Safety**: `POST /api/v1/support/rating`, `POST /api/v1/support/tickets`, `GET /api/v1/support/tickets/me`

---

## 11. Troubleshooting & FAQ

### 1. Port 8080 or 5173 already in use
- On Windows PowerShell:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess | Stop-Process -Force
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force
  ```

### 2. Resetting the Local Embedded Database
- To re-run all Flyway migrations and restore fresh seed accounts:
  ```powershell
  Remove-Item -Path "backend/data/*" -Recurse -Force
  ```
  Restarting the backend will re-create `velogodb.mv.db` cleanly with all initial accounts.

### 3. Razorpay Live Mode Configuration
- By default, VeloGo runs with `app.payment.razorpay.simulator-enabled: true`.
- To switch to Razorpay Test / Live mode:
  1. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env` or system environment variables.
  2. Set `RAZORPAY_SIMULATOR_ENABLED=false`.

---

## License
MIT License. Created as an original mobility engineering project.
## Advanced customer feature suite

See [FEATURE_SUITE_GUIDE.md](FEATURE_SUITE_GUIDE.md) for the eight additional customer-side modules, local data behaviour, verification commands, and production integration notes. The suite is available at `/customer/feature-suite` after customer sign-in.
