# School Student Portal

This repository  contains a plain HTML/CSS/JS student portal backed by Node.js, Express, and MySQL.

## What it does

- Add, edit, view, and delete students
- Add and delete grades for each student
- Show dashboard statistics such as total students, total grades, average score, and passing students
- Serve the entire UI from a static frontend inside the backend app

## Project structure

- `backend/` - Express API, MySQL schema, and backend-only logic
- `frontend/` - HTML, CSS, and browser JavaScript
- `backend/schema.sql` - MySQL schema and sample seed data
- `backend/scripts/init-db.js` - Optional schema bootstrap script

## Setup

1. Install a MySQL server locally or use an existing one.
2. Create a database user with permission to create the `school_portal` database.
3. Copy `backend/.env.example` to `backend/.env` and update the values.
4. Install dependencies in `backend/` with `npm install`.
5. Create the schema with either:
   - `mysql -u root -p < backend/schema.sql`
   - or `npm run init-db` after starting MySQL and setting the `.env` values
6. Start the app with `npm start` from `backend/`.
7. Open `http://localhost:3000` in your browser.

If you want to see the portal without MySQL, run `npm run demo` from `backend/` instead.

## MySQL connection

The backend uses `mysql2/promise` and reads these environment variables from `backend/.env`:

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_PORT`

The database connection is created in `backend/db.js`, and the schema lives in `backend/schema.sql`.

The frontend is served directly from `frontend/`, so there is no React build step.

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
