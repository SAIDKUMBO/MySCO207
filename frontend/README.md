Student Portal — Static demo (HTML/CSS/JS)

This is a frontend-only version of the student portal. It runs without a backend and uses `localStorage` to persist demo data.

How to run

1. Open `frontend/index.html` in your browser, or serve the folder with Live Server / any static file server.

2. Use the demo credentials displayed on the login panel:

- Teacher: `teacher` / `teacher123`
- Student: `amina` / `student123`
- Student: `daniel` / `student123`

Notes

- Data is stored in your browser's `localStorage` under the key `sco207-demo-data-v1`.
- Click "Reset demo data" to restore the seed dataset.
- This build intentionally uses only HTML, CSS and JavaScript (no Node or server required).
