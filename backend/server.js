import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from './db.js'
import { createDemoStore } from './demo-store.js'

dotenv.config()

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const publicDir = path.join(__dirname, '..', 'frontend')
const port = Number(process.env.PORT || 3000)
const useDemoMode = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true'
const demoStore = useDemoMode ? createDemoStore() : null

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(publicDir))

const mapStudentRow = (row) => ({
  id: row.id,
  studentNumber: row.student_number,
  firstName: row.first_name,
  lastName: row.last_name,
  fullName: `${row.first_name} ${row.last_name}`,
  className: row.class_name,
  email: row.email,
  createdAt: row.created_at,
  averageGrade: row.average_grade === null ? null : Number(row.average_grade),
  gradeCount: Number(row.grade_count || 0),
})

const mapGradeRow = (row) => ({
  id: row.id,
  studentId: row.student_id,
  subject: row.subject,
  score: Number(row.score),
  term: row.term,
  createdAt: row.created_at,
})

app.get('/api/health', async (_req, res) => {
  if (useDemoMode) {
    return res.json(demoStore.health())
  }

  try {
    await pool.query('SELECT 1')
    res.json({ ok: true, database: 'connected' })
  } catch (error) {
    res.status(500).json({ ok: false, database: 'disconnected', error: error.message })
  }
})

app.get('/api/students', async (_req, res) => {
  if (useDemoMode) {
    return res.json(demoStore.listStudents())
  }

  try {
    const [rows] = await pool.query(
      `SELECT s.id,
              s.student_number,
              s.first_name,
              s.last_name,
              s.class_name,
              s.email,
              s.created_at,
              ROUND(AVG(g.score), 2) AS average_grade,
              COUNT(g.id) AS grade_count
       FROM students s
       LEFT JOIN grades g ON g.student_id = s.id
       GROUP BY s.id
       ORDER BY s.created_at DESC`
    )

    res.json(rows.map(mapStudentRow))
  } catch (error) {
    res.status(500).json({ message: 'Failed to load students', error: error.message })
  }
})

app.get('/api/students/:id', async (req, res) => {
  if (useDemoMode) {
    const result = demoStore.getStudent(req.params.id)
    if (!result) {
      return res.status(404).json({ message: 'Student not found' })
    }

    return res.json(result)
  }

  try {
    const { id } = req.params
    const [studentRows] = await pool.query('SELECT * FROM students WHERE id = ?', [id])

    if (studentRows.length === 0) {
      return res.status(404).json({ message: 'Student not found' })
    }

    const [gradeRows] = await pool.query(
      'SELECT * FROM grades WHERE student_id = ? ORDER BY created_at DESC',
      [id]
    )

    res.json({
      student: mapStudentRow({ ...studentRows[0], average_grade: null, grade_count: gradeRows.length }),
      grades: gradeRows.map(mapGradeRow),
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to load student', error: error.message })
  }
})

app.post('/api/students', async (req, res) => {
  if (useDemoMode) {
    try {
      const { studentNumber, firstName, lastName, className, email } = req.body

      if (!studentNumber || !firstName || !lastName || !className) {
        return res.status(400).json({
          message: 'studentNumber, firstName, lastName, and className are required',
        })
      }

      const student = demoStore.createStudent({
        studentNumber: studentNumber.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        className: className.trim(),
        email: email?.trim() || null,
      })

      return res.status(201).json(student)
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Student number already exists' })
      }

      return res.status(500).json({ message: 'Failed to create student', error: error.message })
    }
  }

  try {
    const { studentNumber, firstName, lastName, className, email } = req.body

    if (!studentNumber || !firstName || !lastName || !className) {
      return res.status(400).json({
        message: 'studentNumber, firstName, lastName, and className are required',
      })
    }

    const [result] = await pool.query(
      `INSERT INTO students (student_number, first_name, last_name, class_name, email)
       VALUES (?, ?, ?, ?, ?)`,
      [studentNumber.trim(), firstName.trim(), lastName.trim(), className.trim(), email?.trim() || null]
    )

    const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [result.insertId])
    res.status(201).json(mapStudentRow({ ...rows[0], average_grade: null, grade_count: 0 }))
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Student number already exists' })
    }

    res.status(500).json({ message: 'Failed to create student', error: error.message })
  }
})

app.put('/api/students/:id', async (req, res) => {
  if (useDemoMode) {
    try {
      const { id } = req.params
      const { studentNumber, firstName, lastName, className, email } = req.body

      const student = demoStore.updateStudent(id, {
        studentNumber: studentNumber.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        className: className.trim(),
        email: email?.trim() || null,
      })

      if (!student) {
        return res.status(404).json({ message: 'Student not found' })
      }

      return res.json(student)
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Student number already exists' })
      }

      return res.status(500).json({ message: 'Failed to update student', error: error.message })
    }
  }

  try {
    const { id } = req.params
    const { studentNumber, firstName, lastName, className, email } = req.body

    const [result] = await pool.query(
      `UPDATE students
       SET student_number = ?, first_name = ?, last_name = ?, class_name = ?, email = ?
       WHERE id = ?`,
      [studentNumber.trim(), firstName.trim(), lastName.trim(), className.trim(), email?.trim() || null, id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Student not found' })
    }

    const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [id])
    res.json(mapStudentRow({ ...rows[0], average_grade: null, grade_count: 0 }))
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Student number already exists' })
    }

    res.status(500).json({ message: 'Failed to update student', error: error.message })
  }
})

app.delete('/api/students/:id', async (req, res) => {
  if (useDemoMode) {
    const deleted = demoStore.deleteStudent(req.params.id)
    if (!deleted) {
      return res.status(404).json({ message: 'Student not found' })
    }

    return res.json({ message: 'Student deleted successfully' })
  }

  try {
    const { id } = req.params
    const [result] = await pool.query('DELETE FROM students WHERE id = ?', [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Student not found' })
    }

    res.json({ message: 'Student deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete student', error: error.message })
  }
})

app.get('/api/grades', async (req, res) => {
  if (useDemoMode) {
    return res.json(demoStore.listGrades(req.query.studentId))
  }

  try {
    const { studentId } = req.query
    const params = []
    let sql = 'SELECT * FROM grades'

    if (studentId) {
      sql += ' WHERE student_id = ?'
      params.push(studentId)
    }

    sql += ' ORDER BY created_at DESC'

    const [rows] = await pool.query(sql, params)
    res.json(rows.map(mapGradeRow))
  } catch (error) {
    res.status(500).json({ message: 'Failed to load grades', error: error.message })
  }
})

app.post('/api/grades', async (req, res) => {
  if (useDemoMode) {
    const { studentId, subject, score, term } = req.body

    if (!studentId || !subject || score === undefined || !term) {
      return res.status(400).json({ message: 'studentId, subject, score, and term are required' })
    }

    const numericScore = Number(score)

    if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      return res.status(400).json({ message: 'score must be a number between 0 and 100' })
    }

    const grade = demoStore.createGrade({
      studentId,
      subject: subject.trim(),
      score: numericScore,
      term: term.trim(),
    })

    if (!grade) {
      return res.status(404).json({ message: 'Student not found' })
    }

    return res.status(201).json(grade)
  }

  try {
    const { studentId, subject, score, term } = req.body

    if (!studentId || !subject || score === undefined || !term) {
      return res.status(400).json({ message: 'studentId, subject, score, and term are required' })
    }

    const numericScore = Number(score)

    if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      return res.status(400).json({ message: 'score must be a number between 0 and 100' })
    }

    const [studentRows] = await pool.query('SELECT id FROM students WHERE id = ?', [studentId])
    if (studentRows.length === 0) {
      return res.status(404).json({ message: 'Student not found' })
    }

    const [result] = await pool.query(
      `INSERT INTO grades (student_id, subject, score, term)
       VALUES (?, ?, ?, ?)`,
      [studentId, subject.trim(), numericScore, term.trim()]
    )

    const [rows] = await pool.query('SELECT * FROM grades WHERE id = ?', [result.insertId])
    res.status(201).json(mapGradeRow(rows[0]))
  } catch (error) {
    res.status(500).json({ message: 'Failed to create grade', error: error.message })
  }
})

app.delete('/api/grades/:id', async (req, res) => {
  if (useDemoMode) {
    const deleted = demoStore.deleteGrade(req.params.id)
    if (!deleted) {
      return res.status(404).json({ message: 'Grade not found' })
    }

    return res.json({ message: 'Grade deleted successfully' })
  }

  try {
    const { id } = req.params
    const [result] = await pool.query('DELETE FROM grades WHERE id = ?', [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Grade not found' })
    }

    res.json({ message: 'Grade deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete grade', error: error.message })
  }
})

app.get('/api/dashboard', async (_req, res) => {
  if (useDemoMode) {
    return res.json(demoStore.dashboard())
  }

  try {
    const [[studentStats]] = await pool.query(
      `SELECT COUNT(*) AS totalStudents,
              COUNT(CASE WHEN average_score >= 50 THEN 1 END) AS passingStudents
       FROM (
         SELECT s.id, AVG(g.score) AS average_score
         FROM students s
         LEFT JOIN grades g ON g.student_id = s.id
         GROUP BY s.id
       ) AS student_average`
    )

    const [[gradeStats]] = await pool.query(
      `SELECT COUNT(*) AS totalGrades,
              ROUND(AVG(score), 2) AS averageScore,
              MAX(score) AS highestScore,
              MIN(score) AS lowestScore
       FROM grades`
    )

    res.json({
      totalStudents: Number(studentStats.totalStudents || 0),
      passingStudents: Number(studentStats.passingStudents || 0),
      totalGrades: Number(gradeStats.totalGrades || 0),
      averageScore: gradeStats.averageScore === null ? null : Number(gradeStats.averageScore),
      highestScore: gradeStats.highestScore === null ? null : Number(gradeStats.highestScore),
      lowestScore: gradeStats.lowestScore === null ? null : Number(gradeStats.lowestScore),
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to load dashboard', error: error.message })
  }
})

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'))
})

app.listen(port, () => {
  console.log(`Student portal server running on http://localhost:${port}`)
})
