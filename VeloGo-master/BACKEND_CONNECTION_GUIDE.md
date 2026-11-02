# VeloGo Full-Stack Connection Guide

## What is included

This repository contains both applications:

- `frontend/`: React + TypeScript + Vite.
- `backend/`: Java 21 + Spring Boot 3.3.4.
- `backend/src/main/resources/db/migration/`: Flyway database migrations.
- `docker-compose.yml`: PostgreSQL/PostGIS, backend, and frontend services.

The React application uses `frontend/src/services/api.ts` for REST calls. During local development, `frontend/vite.config.ts` proxies `/api` and `/ws` to `http://localhost:8080`.

## Run locally on Windows

Extract the ZIP. Open PowerShell in the folder that contains `backend`, `frontend`, and `docker-compose.yml`.

### Terminal 1 — backend

```powershell
cd backend
mvn spring-boot:run
```

Wait for Spring Boot to finish starting. The local `dev` profile uses an embedded H2 file database, so PostgreSQL is not required for this mode.

Check:

- API health: http://localhost:8080/actuator/health
- Swagger: http://localhost:8080/swagger-ui.html
- H2 console: http://localhost:8080/h2-console

### Terminal 2 — frontend

Open a second PowerShell window. Navigate to the same extracted project folder.

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

**PowerShell path reminder:** if the prompt already ends in `VeloGo-master>`, you are at the project root. Enter `cd frontend`, not `cd VeloGo-master\frontend`. Run `npm install` from the directory containing `package.json`.

## How the connection works

1. The user signs in through the React application.
2. Spring Boot validates credentials and returns JWT access and refresh tokens.
3. The frontend stores the access token and sends it as `Authorization: Bearer <token>`.
4. The Vite proxy forwards `/api/v1/...` requests to Spring Boot on port 8080.
5. Spring Security validates the JWT and checks the user's role.
6. Spring Data JPA reads or writes the H2/PostgreSQL database.
7. Spring Boot returns JSON to the frontend.

WebSocket traffic uses the `/ws` proxy route.

## Extended feature-suite cloud backup API

The new account-scoped endpoint stores optional feature-suite records. The backend always derives the owner from the JWT principal; the request body cannot choose a user ID.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/features/data` | List the signed-in customer's records |
| GET | `/api/v1/features/data?featureKey=feature-suite-backup` | List backups |
| POST | `/api/v1/features/data` | Create a record |
| GET | `/api/v1/features/data/{id}` | Read an owned record |
| PUT | `/api/v1/features/data/{id}` | Update an owned record |
| DELETE | `/api/v1/features/data/{id}` | Delete an owned record |

Example request body:

```json
{
  "featureKey": "favorite-places",
  "title": "My saved places",
  "payload": {
    "places": [
      {
        "name": "Home",
        "latitude": 12.9716,
        "longitude": 77.5946
      }
    ]
  }
}
```

The payload is limited to 100 KB. The endpoint is restricted to `ROLE_CUSTOMER`. Migration `V7__feature_suite_cloud_data.sql` creates the table.

The frontend provides `api.features` methods and explicit `saveFeatureSuiteToCloud(userId)` / `restoreFeatureSuiteFromCloud(userId)` helpers in `frontend/src/features/featureCloudSync.ts`. A user must explicitly invoke restore; it does not silently overwrite local browser data. The existing optional planning modules continue to work locally when cloud backup is not used.

## Demo accounts

The seeded demo accounts use the password `password123`. See the demo credential table in `README.md`. Change demo credentials and development secrets before any public deployment.

## Common problems

- **`mvn` is not recognized:** install Maven 3.9+ and add its `bin` directory to PATH. Java 21 must also be installed.
- **`npm` cannot find `package.json`:** run `cd frontend` first and confirm `dir package.json` lists the file.
- **Frontend says network error:** confirm the backend is running on port 8080 and the frontend was started with `npm run dev`.
- **Port already in use:** stop the other process using port 8080 or 5173, or change the configured port.
- **Database startup issue:** for local mode, run the backend from the `backend` folder so the relative H2 database path is predictable.
- **Build verification:** run `mvn test` from `backend` and `npm run build` from `frontend`.
