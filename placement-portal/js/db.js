/* ==========================================================================
   db.js — client-side data layer
   Simulates the SQL schema (see /sql/schema.sql) using localStorage so the
   portal runs fully offline with zero backend setup. Every table below maps
   1:1 to a table in schema.sql (users, students, companies, drives,
   applications). Swap this file for real fetch() calls to a REST/PHP/Node
   API on top of that schema to go to production.
   ========================================================================== */

const DB_KEYS = {
  users: 'pdp_users',
  students: 'pdp_students',
  companies: 'pdp_companies',
  drives: 'pdp_drives',
  applications: 'pdp_applications',
  seeded: 'pdp_seeded_v1'
};

const SESSION_KEY = 'pdp_session';

function pdpGet(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch (e) { return []; }
}
function pdpSet(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function nextId(rows) {
  return rows.length ? Math.max(...rows.map(r => r.id)) + 1 : 1;
}

/* ---------- Table accessors ---------- */
const DB = {
  users: {
    all: () => pdpGet(DB_KEYS.users),
    save: (rows) => pdpSet(DB_KEYS.users, rows),
    byEmail: (email) => DB.users.all().find(u => u.email.toLowerCase() === String(email).toLowerCase()),
    byId: (id) => DB.users.all().find(u => u.id === id),
    insert: (user) => {
      const rows = DB.users.all();
      user.id = nextId(rows);
      user.created_at = new Date().toISOString();
      rows.push(user);
      DB.users.save(rows);
      return user;
    }
  },
  students: {
    all: () => pdpGet(DB_KEYS.students),
    save: (rows) => pdpSet(DB_KEYS.students, rows),
    byUserId: (uid) => DB.students.all().find(s => s.user_id === uid),
    byId: (id) => DB.students.all().find(s => s.id === id),
    insert: (rec) => {
      const rows = DB.students.all();
      rec.id = nextId(rows);
      rows.push(rec);
      DB.students.save(rows);
      return rec;
    },
    update: (id, patch) => {
      const rows = DB.students.all();
      const i = rows.findIndex(s => s.id === id);
      if (i > -1) { rows[i] = { ...rows[i], ...patch }; DB.students.save(rows); }
      return rows[i];
    }
  },
  companies: {
    all: () => pdpGet(DB_KEYS.companies),
    save: (rows) => pdpSet(DB_KEYS.companies, rows),
    byUserId: (uid) => DB.companies.all().find(c => c.user_id === uid),
    byId: (id) => DB.companies.all().find(c => c.id === id),
    insert: (rec) => {
      const rows = DB.companies.all();
      rec.id = nextId(rows);
      rows.push(rec);
      DB.companies.save(rows);
      return rec;
    },
    update: (id, patch) => {
      const rows = DB.companies.all();
      const i = rows.findIndex(c => c.id === id);
      if (i > -1) { rows[i] = { ...rows[i], ...patch }; DB.companies.save(rows); }
      return rows[i];
    }
  },
  drives: {
    all: () => pdpGet(DB_KEYS.drives),
    save: (rows) => pdpSet(DB_KEYS.drives, rows),
    byId: (id) => DB.drives.all().find(d => d.id === id),
    byCompany: (cid) => DB.drives.all().filter(d => d.company_id === cid),
    insert: (rec) => {
      const rows = DB.drives.all();
      rec.id = nextId(rows);
      rec.created_at = new Date().toISOString();
      rows.push(rec);
      DB.drives.save(rows);
      return rec;
    },
    update: (id, patch) => {
      const rows = DB.drives.all();
      const i = rows.findIndex(d => d.id === id);
      if (i > -1) { rows[i] = { ...rows[i], ...patch }; DB.drives.save(rows); }
      return rows[i];
    }
  },
  applications: {
    all: () => pdpGet(DB_KEYS.applications),
    save: (rows) => pdpSet(DB_KEYS.applications, rows),
    byId: (id) => DB.applications.all().find(a => a.id === id),
    byStudent: (sid) => DB.applications.all().filter(a => a.student_id === sid),
    byDrive: (did) => DB.applications.all().filter(a => a.drive_id === did),
    insert: (rec) => {
      const rows = DB.applications.all();
      rec.id = nextId(rows);
      rec.applied_at = new Date().toISOString();
      rec.updated_at = rec.applied_at;
      rows.push(rec);
      DB.applications.save(rows);
      return rec;
    },
    update: (id, patch) => {
      const rows = DB.applications.all();
      const i = rows.findIndex(a => a.id === id);
      if (i > -1) {
        rows[i] = { ...rows[i], ...patch, updated_at: new Date().toISOString() };
        DB.applications.save(rows);
      }
      return rows[i];
    }
  }
};

/* ---------- Eligibility engine ----------
   Mirrors the WHERE clause you'd run in SQL to find eligible students:
   cgpa >= min_cgpa AND backlogs <= max_backlogs AND branch IN eligible_branches
*/
function checkEligibility(student, drive) {
  const reasons = [];
  if (student.cgpa < drive.min_cgpa) reasons.push(`CGPA ${student.cgpa} is below required ${drive.min_cgpa}`);
  if (student.backlogs > drive.max_backlogs) reasons.push(`${student.backlogs} active backlog(s) exceed allowed ${drive.max_backlogs}`);
  const branches = drive.eligible_branches.split(',').map(b => b.trim());
  if (!branches.includes('All') && !branches.includes(student.branch)) reasons.push(`Branch ${student.branch} not eligible for this drive`);
  return { eligible: reasons.length === 0, reasons };
}

/* ---------- Seed data ---------- */
function seedIfEmpty() {
  if (localStorage.getItem(DB_KEYS.seeded)) return;

  const users = [];
  const students = [];
  const companies = [];
  const drives = [];
  const applications = [];

  // Admin
  users.push({ id: 1, name: 'Placement Officer', email: 'admin@portal.com', password: 'admin123', role: 'admin', created_at: new Date().toISOString() });

  // Students
  const studentSeed = [
    { name: 'Aditi Rao', email: 'aditi@college.edu', roll_no: 'CSE21001', branch: 'CSE', cgpa: 8.7, backlogs: 0, phone: '9876543210', skills: 'JavaScript, React, SQL' },
    { name: 'Rahul Verma', email: 'rahul@college.edu', roll_no: 'ECE21014', branch: 'ECE', cgpa: 7.2, backlogs: 1, phone: '9876543211', skills: 'Embedded C, VLSI' },
    { name: 'Sneha Iyer', email: 'sneha@college.edu', roll_no: 'IT21045', branch: 'IT', cgpa: 9.1, backlogs: 0, phone: '9876543212', skills: 'Python, Django, ML' },
    { name: 'Kiran Patel', email: 'kiran@college.edu', roll_no: 'MECH21033', branch: 'MECH', cgpa: 6.5, backlogs: 2, phone: '9876543213', skills: 'AutoCAD, SolidWorks' },
    { name: 'Divya Nair', email: 'divya@college.edu', roll_no: 'CSE21067', branch: 'CSE', cgpa: 8.1, backlogs: 0, phone: '9876543214', skills: 'Java, Spring Boot' }
  ];
  studentSeed.forEach((s, idx) => {
    const uid = idx + 2;
    users.push({ id: uid, name: s.name, email: s.email, password: 'student123', role: 'student', created_at: new Date().toISOString() });
    students.push({ id: idx + 1, user_id: uid, roll_no: s.roll_no, branch: s.branch, cgpa: s.cgpa, backlogs: s.backlogs, phone: s.phone, skills: s.skills, resume_link: '' });
  });

  // Companies
  const companySeed = [
    { name: 'NimbusWorks Technologies', email: 'hr@nimbusworks.com', industry: 'Software / SaaS', website: 'https://nimbusworks.example.com', description: 'Cloud infrastructure and developer tooling company.', status: 'approved' },
    { name: 'Vertex Analytics', email: 'careers@vertexanalytics.com', industry: 'Data & AI', website: 'https://vertexanalytics.example.com', description: 'Data science and applied ML consultancy.', status: 'approved' },
    { name: 'Ironclad Manufacturing Co.', email: 'talent@ironcladmfg.com', industry: 'Core / Manufacturing', website: 'https://ironcladmfg.example.com', description: 'Precision manufacturing and industrial automation.', status: 'pending' }
  ];
  companySeed.forEach((c, idx) => {
    const uid = studentSeed.length + 2 + idx;
    users.push({ id: uid, name: c.name, email: c.email, password: 'company123', role: 'company', created_at: new Date().toISOString() });
    companies.push({ id: idx + 1, user_id: uid, name: c.name, industry: c.industry, website: c.website, description: c.description, status: c.status });
  });

  // Drives (posted by approved companies)
  drives.push({ id: 1, company_id: 1, title: 'Software Development Engineer', role: 'SDE-1', package_lpa: 12, min_cgpa: 7.5, max_backlogs: 0, eligible_branches: 'CSE, IT', drive_date: '2026-09-10', deadline: '2026-09-01', description: 'Build product features across the NimbusWorks cloud platform. Rounds: Online test, Technical interview x2, HR.', status: 'open' });
  drives.push({ id: 2, company_id: 1, title: 'Frontend Engineer Intern', role: 'Intern', package_lpa: 6, min_cgpa: 7.0, max_backlogs: 1, eligible_branches: 'CSE, IT, ECE', drive_date: '2026-09-18', deadline: '2026-09-08', description: '6-month internship building UI for internal dashboards.', status: 'open' });
  drives.push({ id: 3, company_id: 2, title: 'Data Analyst', role: 'Analyst', package_lpa: 9.5, min_cgpa: 8.0, max_backlogs: 0, eligible_branches: 'CSE, IT, All', drive_date: '2026-09-22', deadline: '2026-09-12', description: 'Work with product and growth teams on analytics pipelines and dashboards.', status: 'open' });
  drives.push({ id: 4, company_id: 2, title: 'Machine Learning Engineer', role: 'MLE-1', package_lpa: 15, min_cgpa: 8.5, max_backlogs: 0, eligible_branches: 'CSE, IT', drive_date: '2026-08-25', deadline: '2026-08-20', description: 'Applied ML role focused on recommendation systems.', status: 'closed' });

  // Applications
  applications.push({ id: 1, drive_id: 1, student_id: 1, status: 'shortlisted', applied_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  applications.push({ id: 2, drive_id: 3, student_id: 3, status: 'selected', applied_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  applications.push({ id: 3, drive_id: 2, student_id: 5, status: 'applied', applied_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  applications.push({ id: 4, drive_id: 4, student_id: 3, status: 'rejected', applied_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  applications.push({ id: 5, drive_id: 1, student_id: 5, status: 'interview', applied_at: new Date().toISOString(), updated_at: new Date().toISOString() });

  DB.users.save(users);
  DB.students.save(students);
  DB.companies.save(companies);
  DB.drives.save(drives);
  DB.applications.save(applications);
  localStorage.setItem(DB_KEYS.seeded, '1');
}

seedIfEmpty();

/* ---------- Session helpers ---------- */
function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
  catch (e) { return null; }
}
function setSession(user) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); }
function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

function requireRole(role) {
  const s = getSession();
  if (!s || s.role !== role) { window.location.href = 'index.html'; return null; }
  return s;
}

function logout() { clearSession(); window.location.href = 'index.html'; }

function initials(name) {
  return (name || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusLabel(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
