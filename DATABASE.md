# MySQL Setup

CareerX stores account credentials, sessions, per-user app state, password reset tokens, and admin-published listings in MySQL. Static career/course reference catalogs remain bundled with the frontend.

## Configure

1. Ensure the local MySQL 8 service is running.
2. Add the `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, and `MYSQL_PASSWORD` values from `.env.example` to the existing project-root `.env`. Do not overwrite existing SMTP settings.
3. Use a MySQL account that can create the `careerx` database and tables, or create the database in advance and grant the app user access.
4. Set `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` in `.env`. Keep the password private; the server stores only a salted hash and never returns it to the browser.
5. Restart with `npm run dev`.
6. Check `http://localhost:5173/api/health`; `databaseReady` and `defaultAdminReady` should both be `true`.

The API creates its tables on startup. The SMTP password and MySQL password must stay in `.env`, which is ignored by Git.

Admin accounts cannot be self-registered or imported from browser-local data. The single environment-provisioned root admin can inspect, edit, export, and delete student records from Admin → Users.

## Job Feeds

Admin → Publish accepts public RSS/Atom feeds for Naukri, Unstop, LinkedIn, and configured government portals. Put only official or provider-authorized HTTPS RSS/Atom URLs in the matching `JOB_FEED_*_URL` / `GOV_FEED_*_URL` entries in `.env`; the fetcher rejects other hosts and does not scrape HTML pages. Blank feed settings are shown as unconfigured. Source listings can still be entered through the manual publish form. Publishing a fetched listing uses the same eligibility and student-email notification flow as a manual listing.

## Existing Demo Data

On a successful login, the app imports the current browser's legacy account and user-data records. Each existing account should log in once from the browser that contains its local profile so its profile and progress can migrate. Admin-published listings are shared in MySQL after migration from the admin browser.

Browser preferences may remain cached locally for fast startup; MySQL is the shared persistent store for authenticated user data. This local demo API binds to `127.0.0.1`; deploying it to a network requires production-grade session, TLS, CORS, backup, and authorization configuration.
