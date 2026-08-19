-- ============================================================================
-- Sample data for placement_drive_portal
-- Mirrors the demo data seeded automatically into localStorage by js/db.js,
-- so the SQL schema can be demoed with realistic records too.
-- NOTE: passwords here are placeholders — replace with real bcrypt hashes.
-- ============================================================================

USE placement_drive_portal;

INSERT INTO users (name, email, password_hash, role) VALUES
('Placement Officer', 'admin@portal.com', '$2y$10$examplehashadmin', 'admin'),
('Aditi Rao',   'aditi@college.edu', '$2y$10$examplehash1', 'student'),
('Rahul Verma', 'rahul@college.edu', '$2y$10$examplehash2', 'student'),
('Sneha Iyer',  'sneha@college.edu', '$2y$10$examplehash3', 'student'),
('Kiran Patel', 'kiran@college.edu', '$2y$10$examplehash4', 'student'),
('Divya Nair',  'divya@college.edu', '$2y$10$examplehash5', 'student'),
('NimbusWorks Technologies', 'hr@nimbusworks.com', '$2y$10$examplehash6', 'company'),
('Vertex Analytics', 'careers@vertexanalytics.com', '$2y$10$examplehash7', 'company'),
('Ironclad Manufacturing Co.', 'talent@ironcladmfg.com', '$2y$10$examplehash8', 'company');

INSERT INTO students (user_id, roll_no, branch, cgpa, backlogs, phone, skills) VALUES
(2, 'CSE21001', 'CSE',  8.7, 0, '9876543210', 'JavaScript, React, SQL'),
(3, 'ECE21014', 'ECE',  7.2, 1, '9876543211', 'Embedded C, VLSI'),
(4, 'IT21045',  'IT',   9.1, 0, '9876543212', 'Python, Django, ML'),
(5, 'MECH21033','MECH', 6.5, 2, '9876543213', 'AutoCAD, SolidWorks'),
(6, 'CSE21067', 'CSE',  8.1, 0, '9876543214', 'Java, Spring Boot');

INSERT INTO companies (user_id, name, industry, website, description, status) VALUES
(7, 'NimbusWorks Technologies', 'Software / SaaS', 'https://nimbusworks.example.com', 'Cloud infrastructure and developer tooling company.', 'approved'),
(8, 'Vertex Analytics', 'Data & AI', 'https://vertexanalytics.example.com', 'Data science and applied ML consultancy.', 'approved'),
(9, 'Ironclad Manufacturing Co.', 'Core / Manufacturing', 'https://ironcladmfg.example.com', 'Precision manufacturing and industrial automation.', 'pending');

INSERT INTO drives (company_id, title, role, package_lpa, min_cgpa, max_backlogs, eligible_branches, drive_date, deadline, description, status) VALUES
(1, 'Software Development Engineer', 'SDE-1', 12.0, 7.5, 0, 'CSE,IT', '2026-09-10', '2026-09-01', 'Build product features across the NimbusWorks cloud platform. Rounds: Online test, Technical interview x2, HR.', 'open'),
(1, 'Frontend Engineer Intern', 'Intern', 6.0, 7.0, 1, 'CSE,IT,ECE', '2026-09-18', '2026-09-08', '6-month internship building UI for internal dashboards.', 'open'),
(2, 'Data Analyst', 'Analyst', 9.5, 8.0, 0, 'CSE,IT,All', '2026-09-22', '2026-09-12', 'Work with product and growth teams on analytics pipelines and dashboards.', 'open'),
(2, 'Machine Learning Engineer', 'MLE-1', 15.0, 8.5, 0, 'CSE,IT', '2026-08-25', '2026-08-20', 'Applied ML role focused on recommendation systems.', 'closed');

INSERT INTO applications (drive_id, student_id, status) VALUES
(1, 1, 'shortlisted'),
(3, 3, 'selected'),
(2, 5, 'applied'),
(4, 3, 'rejected'),
(1, 5, 'interview');
