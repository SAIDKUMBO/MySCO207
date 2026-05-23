# Backend

This folder contains the Express server, MySQL schema, and the logic that serves the static frontend from `frontend/`.

## Run locally

```bash
npm install
cp .env.example .env
npm run init-db
npm start
```

To view the portal without MySQL, run `npm run demo` instead of `npm start`.

## Database

The app expects a MySQL database named `school_portal`. The schema file creates the database, tables, and sample data.

The frontend files live in the repository root `frontend/` directory, which the server serves as static content.

If you already have a MySQL server, update `.env` with the correct host, user, password, and port.
