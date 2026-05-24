CREATE DATABASE IF NOT EXISTS school_portal;
USE school_portal;

CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_number VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  class_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject VARCHAR(120) NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  term VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_grades_student
    FOREIGN KEY (student_id) REFERENCES students(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password VARCHAR(120) NOT NULL,
  role VARCHAR(20) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  student_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_student
    FOREIGN KEY (student_id) REFERENCES students(id)
    ON DELETE SET NULL
);

INSERT INTO students (student_number, first_name, last_name, class_name, email)
SELECT 'STU-001', 'Amina', 'Mensah', 'Grade 10A', 'amina@example.com'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE student_number = 'STU-001');

INSERT INTO students (student_number, first_name, last_name, class_name, email)
SELECT 'STU-002', 'Daniel', 'Owusu', 'Grade 11B', 'daniel@example.com'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE student_number = 'STU-002');

INSERT INTO grades (student_id, subject, score, term)
SELECT s.id, 'Programming Fundamentals', 84.5, 'Term 1'
FROM students s
WHERE s.student_number = 'STU-001'
  AND NOT EXISTS (
    SELECT 1 FROM grades g WHERE g.student_id = s.id AND g.subject = 'Programming Fundamentals' AND g.term = 'Term 1'
  );

INSERT INTO grades (student_id, subject, score, term)
SELECT s.id, 'Data Structures', 76.0, 'Term 1'
FROM students s
WHERE s.student_number = 'STU-001'
  AND NOT EXISTS (
    SELECT 1 FROM grades g WHERE g.student_id = s.id AND g.subject = 'Data Structures' AND g.term = 'Term 1'
  );

INSERT INTO grades (student_id, subject, score, term)
SELECT s.id, 'Computer Systems', 69.0, 'Term 1'
FROM students s
WHERE s.student_number = 'STU-002'
  AND NOT EXISTS (
    SELECT 1 FROM grades g WHERE g.student_id = s.id AND g.subject = 'Computer Systems' AND g.term = 'Term 1'
  );

INSERT INTO grades (student_id, subject, score, term)
SELECT s.id, 'Database Systems', 91.0, 'Term 1'
FROM students s
WHERE s.student_number = 'STU-001'
  AND NOT EXISTS (
    SELECT 1 FROM grades g WHERE g.student_id = s.id AND g.subject = 'Database Systems' AND g.term = 'Term 1'
  );

INSERT INTO grades (student_id, subject, score, term)
SELECT s.id, 'Web Development', 88.0, 'Term 1'
FROM students s
WHERE s.student_number = 'STU-002'
  AND NOT EXISTS (
    SELECT 1 FROM grades g WHERE g.student_id = s.id AND g.subject = 'Web Development' AND g.term = 'Term 1'
  );

INSERT INTO grades (student_id, subject, score, term)
SELECT s.id, 'Software Engineering', 82.0, 'Term 1'
FROM students s
WHERE s.student_number = 'STU-002'
  AND NOT EXISTS (
    SELECT 1 FROM grades g WHERE g.student_id = s.id AND g.subject = 'Software Engineering' AND g.term = 'Term 1'
  );

INSERT INTO users (username, password, role, full_name, student_id)
SELECT 'teacher', 'teacher123', 'teacher', 'Teacher Admin', NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'teacher');

INSERT INTO users (username, password, role, full_name, student_id)
SELECT 'amina', 'student123', 'student', CONCAT(s.first_name, ' ', s.last_name), s.id
FROM students s
WHERE s.student_number = 'STU-001'
  AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'amina');

INSERT INTO users (username, password, role, full_name, student_id)
SELECT 'daniel', 'student123', 'student', CONCAT(s.first_name, ' ', s.last_name), s.id
FROM students s
WHERE s.student_number = 'STU-002'
  AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'daniel');
