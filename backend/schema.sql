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

INSERT INTO students (student_number, first_name, last_name, class_name, email)
SELECT 'STU-001', 'Amina', 'Mensah', 'Grade 10A', 'amina@example.com'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE student_number = 'STU-001');

INSERT INTO students (student_number, first_name, last_name, class_name, email)
SELECT 'STU-002', 'Daniel', 'Owusu', 'Grade 11B', 'daniel@example.com'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE student_number = 'STU-002');

INSERT INTO grades (student_id, subject, score, term)
SELECT s.id, 'Mathematics', 84.5, 'Term 1'
FROM students s
WHERE s.student_number = 'STU-001'
  AND NOT EXISTS (
    SELECT 1 FROM grades g WHERE g.student_id = s.id AND g.subject = 'Mathematics' AND g.term = 'Term 1'
  );

INSERT INTO grades (student_id, subject, score, term)
SELECT s.id, 'English', 76.0, 'Term 1'
FROM students s
WHERE s.student_number = 'STU-001'
  AND NOT EXISTS (
    SELECT 1 FROM grades g WHERE g.student_id = s.id AND g.subject = 'English' AND g.term = 'Term 1'
  );

INSERT INTO grades (student_id, subject, score, term)
SELECT s.id, 'Science', 69.0, 'Term 1'
FROM students s
WHERE s.student_number = 'STU-002'
  AND NOT EXISTS (
    SELECT 1 FROM grades g WHERE g.student_id = s.id AND g.subject = 'Science' AND g.term = 'Term 1'
  );
