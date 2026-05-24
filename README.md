# School Student Portal

This repository  contains a plain HTML/CSS/JS student portal backed by Node.js, Express, and MySQL.

## What it does

- Add, edit, view, and delete students
- Add and delete grades for each student
- Show dashboard statistics such as total students, total grades, average score, and passing students
- Support teacher login for full management access
- Support student login for read-only access to their own profile and grades
- Serve the entire UI from a static frontend inside the backend app

## Project structure

- `backend/` - Express API, MySQL schema, and backend-only logic
- `frontend/` - HTML, CSS, and browser JavaScript
- `backend/schema.sql` - MySQL schema and sample seed data
- `backend/scripts/init-db.js` - Optional schema bootstrap script

## Setup

1. Install and start MySQL locally, or point the app at an existing MySQL server.
2. Copy `backend/.env.example` to `backend/.env` and set `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `DB_PORT`.
3. Install backend dependencies with `cd backend && npm install`.
4. Create the database and seed data with one of these commands:
   - `cd backend && npm run init-db`
   - `mysql -u root -p < backend/schema.sql`
5. Start the API and dashboard with `cd backend && npm start`.
6. Open `http://localhost:3000` in your browser.

If you want to see the portal without MySQL, run `npm run demo` from `backend/` instead.

## MySQL connection

The backend uses `mysql2/promise` and reads these environment variables from `backend/.env`:

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_PORT`

The database connection is created in `backend/db.js`, and the schema lives in `backend/schema.sql`. The bootstrap script at `backend/scripts/init-db.js` loads that schema directly into your MySQL server.

The frontend is served directly from `frontend/`, so there is no React build step.

The dashboard now uses a white-and-blue visual style, with teachers seeing the full management surface and students seeing a limited personal view after login.

## If MySQL does not connect

1. Confirm MySQL is running on the host and port from `backend/.env`.
2. Verify the user in `DB_USER` can create tables in the `school_portal` database.
3. Check that `DB_PASSWORD` is correct and that the database name matches `DB_NAME`.
4. Use `npm run demo` while you troubleshoot the database to confirm the UI still loads.

## API endpoints

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/students`
- `GET /api/students/:id`
- `POST /api/students`
- `PUT /api/students/:id`
- `DELETE /api/students/:id`
- `GET /api/grades?studentId=1`
- `POST /api/grades`
- `DELETE /api/grades/:id`
