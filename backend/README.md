# Backend

This folder contains the Express server, MySQL schema, and the logic that serves the static frontend from `frontend/`.

## Run locally

```bash
npm install
cp .env.example .env
npm run init-db
npm start
```

The backend reads `.env` with `dotenv`, so keep the real credentials only in `backend/.env`. `backend/.env.example` is the clean template to commit.

`npm run init-db` loads `schema.sql` into the MySQL server pointed to by `.env`. If you already created the database manually, you can also import the file with `mysql -u root -p < schema.sql`.

To view the portal without MySQL, run `npm run demo` instead of `npm start`.

### Login roles

The seed data creates these demo accounts:

1. Teacher: `teacher` / `teacher123`
2. Student: `amina` / `student123`
3. Student: `daniel` / `student123`

Teachers can manage students and grades. Students can log in and only view their own record and grades.

## Database

The app expects a MySQL database named `school_portal`. The schema file creates the database, tables, and sample data.

The frontend files live in the repository root `frontend/` directory, which the server serves as static content.

If you already have a MySQL server, update `.env` with the correct host, user, password, port, and `AUTH_SECRET`.

### Connection checklist

1. Make sure the MySQL service is running.
2. Confirm the credentials in `.env` can connect to the server.
3. Confirm `DB_NAME=school_portal` matches the imported schema.
4. If you change any values in `.env`, restart the Node server so the new connection settings are picked up.
