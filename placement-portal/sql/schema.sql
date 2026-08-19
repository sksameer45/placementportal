-- ============================================================================
-- Placement Drive Portal — Database Schema (MySQL 8.0+)
-- ----------------------------------------------------------------------------
-- This schema is the production-backend counterpart of the client-side
-- localStorage data layer in /js/db.js. Wire up a REST API (PHP, Node/Express,
-- etc.) on top of these tables and swap the fetch calls in the JS files to
-- go from demo mode to a real multi-user deployment.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS placement_drive_portal
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE placement_drive_portal;

-- ----------------------------------------------------------------------------
-- USERS — single login table for all three roles (student / company / admin)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,          -- store bcrypt/argon2 hash, never plaintext
  role          ENUM('student', 'company', 'admin') NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- STUDENTS — profile + eligibility attributes, 1:1 with a 'student' user
-- ----------------------------------------------------------------------------
CREATE TABLE students (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL UNIQUE,
  roll_no      VARCHAR(30) NOT NULL UNIQUE,
  branch       VARCHAR(50) NOT NULL,
  cgpa         DECIMAL(4,2) NOT NULL CHECK (cgpa BETWEEN 0 AND 10),
  backlogs     INT NOT NULL DEFAULT 0 CHECK (backlogs >= 0),
  phone        VARCHAR(20),
  skills       VARCHAR(500),
  resume_link  VARCHAR(500),
  CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- COMPANIES — recruiter profile, 1:1 with a 'company' user, gated by admin
-- ----------------------------------------------------------------------------
CREATE TABLE companies (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL UNIQUE,
  name         VARCHAR(150) NOT NULL,
  industry     VARCHAR(100),
  website      VARCHAR(255),
  description  TEXT,
  status       ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  CONSTRAINT fk_companies_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- DRIVES — job postings created by approved companies
-- ----------------------------------------------------------------------------
CREATE TABLE drives (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  company_id         INT NOT NULL,
  title              VARCHAR(150) NOT NULL,
  role               VARCHAR(100) NOT NULL,
  package_lpa        DECIMAL(6,2) NOT NULL,
  min_cgpa           DECIMAL(4,2) NOT NULL,
  max_backlogs       INT NOT NULL DEFAULT 0,
  eligible_branches  VARCHAR(200) NOT NULL,      -- comma separated, e.g. 'CSE,IT' or 'All'
  drive_date         DATE NOT NULL,
  deadline           DATE NOT NULL,
  description        TEXT,
  status             ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_drives_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- APPLICATIONS — join table tracking a student's progress through a drive
-- ----------------------------------------------------------------------------
CREATE TABLE applications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  drive_id    INT NOT NULL,
  student_id  INT NOT NULL,
  status      ENUM('applied','shortlisted','test','interview','selected','rejected') NOT NULL DEFAULT 'applied',
  applied_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_apps_drive   FOREIGN KEY (drive_id)   REFERENCES drives(id)   ON DELETE CASCADE,
  CONSTRAINT fk_apps_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_student_drive (drive_id, student_id)   -- one application per student per drive
);

-- Helpful indexes for common lookups
CREATE INDEX idx_students_branch      ON students(branch);
CREATE INDEX idx_drives_status        ON drives(status);
CREATE INDEX idx_applications_status  ON applications(status);

-- ============================================================================
-- USEFUL QUERIES (matching the app's core logic)
-- ============================================================================

-- 1) Eligibility check for a given student against a given drive
--    (mirrors checkEligibility() in js/db.js)
-- SELECT d.*
-- FROM drives d
-- JOIN students s ON s.id = :student_id
-- WHERE d.id = :drive_id
--   AND s.cgpa >= d.min_cgpa
--   AND s.backlogs <= d.max_backlogs
--   AND (d.eligible_branches LIKE '%All%' OR FIND_IN_SET(s.branch, d.eligible_branches));

-- 2) All open drives a student is eligible for
-- SELECT d.*
-- FROM drives d, students s
-- WHERE s.id = :student_id
--   AND d.status = 'open'
--   AND s.cgpa >= d.min_cgpa
--   AND s.backlogs <= d.max_backlogs
--   AND (d.eligible_branches LIKE '%All%' OR FIND_IN_SET(s.branch, d.eligible_branches));

-- 3) Placement rate by branch
-- SELECT s.branch,
--        COUNT(DISTINCT s.id) AS total_students,
--        COUNT(DISTINCT CASE WHEN a.status = 'selected' THEN s.id END) AS placed_students,
--        ROUND(COUNT(DISTINCT CASE WHEN a.status = 'selected' THEN s.id END) * 100.0
--              / COUNT(DISTINCT s.id), 1) AS placement_pct
-- FROM students s
-- LEFT JOIN applications a ON a.student_id = s.id
-- GROUP BY s.branch;

-- 4) Applicant pipeline for a company's drive
-- SELECT u.name, s.roll_no, s.branch, s.cgpa, a.status, a.applied_at
-- FROM applications a
-- JOIN students s ON s.id = a.student_id
-- JOIN users u ON u.id = s.user_id
-- WHERE a.drive_id = :drive_id
-- ORDER BY a.applied_at DESC;

-- 5) Companies awaiting approval
-- SELECT c.*, u.email, u.created_at
-- FROM companies c JOIN users u ON u.id = c.user_id
-- WHERE c.status = 'pending';
