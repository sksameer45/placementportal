# Placement Drive Portal

A responsive campus placement management portal built with **HTML, CSS, JavaScript, and SQL**. It automates student eligibility checks, streamlines company registration and job-drive postings, and gives a placement cell (admin) a single dashboard to track the entire recruitment pipeline.

## ✨ Features

**Students**
- Register with academic profile (branch, CGPA, backlogs, skills)
- Browse open drives — the portal automatically flags which ones you're eligible for, based on CGPA, backlog, and branch rules
- One-click apply, with a visual status tracker (Applied → Shortlisted → Test → Interview → Selected)
- Editable profile

**Companies**
- Self-service registration (goes into a "pending" queue for admin approval)
- Post, edit, close/reopen placement drives with eligibility criteria
- View and filter applicants per drive, update their status inline
- Company profile management

**Admin / Placement Cell**
- Approve or reject company registrations
- Full student directory with search
- Branch-wise placement rate chart and application-status breakdown
- View every drive and every application across the platform

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 (custom design system, no framework) |
| Behavior | Vanilla JavaScript (ES6) |
| Data | SQL schema (`/sql`) + a localStorage-backed data layer (`/js/db.js`) that mirrors it for a zero-setup demo |

## 🚀 Running the demo

No build step, no server required.

1. Unzip the project.
2. Open `index.html` in any modern browser.

That's it — the app seeds itself with demo data on first load (see `js/db.js`).

### Demo logins

| Role | Email | Password |
|---|---|---|
| Admin | `admin@portal.com` | `admin123` |
| Student | `aditi@college.edu` | `student123` |
| Company (approved) | `hr@nimbusworks.com` | `company123` |
| Company (pending, for testing approval flow) | `talent@ironcladmfg.com` | `company123` |

You can also register brand-new student or company accounts from the **Create an account** link on the login page.

## 🗄️ Going to production with real SQL

This project ships two layers on purpose:

1. **`/js/db.js`** — a localStorage-backed data layer so the whole app runs instantly in a browser with no backend, ideal for demos, grading, or portfolios.
2. **`/sql/schema.sql`** and **`/sql/sample_data.sql`** — the real relational schema (`users`, `students`, `companies`, `drives`, `applications`) that the data layer mirrors, ready to run on MySQL.

To turn this into a full-stack deployment:

1. Create the database: `mysql -u root -p < sql/schema.sql`
2. (Optional) Load sample data: `mysql -u root -p < sql/sample_data.sql`
3. Build a small REST API (PHP, Node/Express, Flask, etc.) exposing endpoints for each table.
4. Replace the functions inside `js/db.js` (`DB.users`, `DB.students`, `DB.companies`, `DB.drives`, `DB.applications`) with `fetch()` calls to that API. Every other file (`student.js`, `company.js`, `admin.js`) already talks to `DB.*` only, so no other code needs to change.
5. Hash passwords server-side (bcrypt/argon2) instead of the plaintext demo storage used here.

## 📁 Project structure

```
placement-portal/
├── index.html                # Login
├── register.html             # Student / company sign-up
├── student-dashboard.html    # Student portal
├── company-dashboard.html    # Company portal
├── admin-dashboard.html      # Admin / placement cell portal
├── css/
│   └── style.css             # Design system + all component styles
├── js/
│   ├── db.js                 # Data layer (localStorage) + eligibility engine + seed data
│   ├── auth.js                # Login logic
│   ├── register.js            # Registration logic
│   ├── student.js             # Student dashboard logic
│   ├── company.js             # Company dashboard logic
│   └── admin.js               # Admin dashboard logic
├── sql/
│   ├── schema.sql             # Full relational schema + example queries
│   └── sample_data.sql        # Seed data matching the demo
└── README.md
```

## 🔐 Note on security

This is a demo/portfolio build: passwords are stored in plain text in `localStorage` purely so the app works with zero backend setup. **Never do this in production** — the SQL schema and README section above outline the real path (hashed passwords, server-side auth, sessions/JWT).
