import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from './db.js'
import { createDemoStore } from './demo-store.js'
import { createAuthToken, requireAuth, requireRole } from './auth.js'

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

const mapUserRow = (row) => ({
  id: row.id,
  username: row.username,
  fullName: row.full_name,
  role: row.role,
  studentId: row.student_id === null ? null : Number(row.student_id),
  studentNumber: row.student_number || null,
  className: row.class_name || null,
})

const mapStudentWithSummary = (row) => ({
  ...mapStudentRow(row),
  averageGrade: row.average_grade === null ? null : Number(row.average_grade),
  gradeCount: Number(row.grade_count || 0),
})

function isTeacher(user) {
  return user?.role === 'teacher'
}

function canAccessStudent(user, studentId) {
  return isTeacher(user) || Number(user?.studentId) === Number(studentId)
}

async function loadUserProfile(userId) {
  if (useDemoMode) {
    return demoStore.getMe(userId)
  }

  const [rows] = await pool.query(
    `SELECT u.id,
            u.username,
            u.full_name,
            u.role,
            u.student_id,
            s.student_number,
            s.class_name
     FROM users u
     LEFT JOIN students s ON s.id = u.student_id
     WHERE u.id = ?`,
    [userId]
  )

  if (rows.length === 0) {
    return null
  }

  return mapUserRow(rows[0])
}

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

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ message: 'username and password are required' })
  }

  if (useDemoMode) {
    const user = demoStore.authenticate(username.trim(), password)
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' })
    }

    return res.json({ token: createAuthToken(user), user })
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.id,
              u.username,
              u.password,
              u.full_name,
              u.role,
              u.student_id,
              s.student_number,
              s.class_name
       FROM users u
       LEFT JOIN students s ON s.id = u.student_id
       WHERE u.username = ?
       LIMIT 1`,
      [username.trim()]
    )

    if (rows.length === 0 || rows[0].password !== password) {
      return res.status(401).json({ message: 'Invalid username or password' })
    }

    const user = mapUserRow(rows[0])
    return res.json({ token: createAuthToken(user), user })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to login', error: error.message })
  }
})

app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path === '/auth/login') {
    return next()
  }

  return requireAuth(req, res, next)
})

app.get('/api/auth/me', async (req, res) => {
  try {
    const profile = await loadUserProfile(req.user.id)
    if (!profile) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ user: profile })
  } catch (error) {
    res.status(500).json({ message: 'Failed to load profile', error: error.message })
  }
})

app.get('/api/students', async (req, res) => {
  if (useDemoMode) {
    return res.json(demoStore.listStudentsForUser(req.user))
  }

  try {
    const query = isTeacher(req.user)
      ? `SELECT s.id,
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
      : `SELECT s.id,
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
         WHERE s.id = ?
         GROUP BY s.id
         ORDER BY s.created_at DESC`

    const params = isTeacher(req.user) ? [] : [req.user.studentId]
    const [rows] = await pool.query(query, params)

    res.json(rows.map(mapStudentWithSummary))
  } catch (error) {
    res.status(500).json({ message: 'Failed to load students', error: error.message })
  }
})

app.get('/api/students/:id', async (req, res) => {
  if (useDemoMode) {
    const result = demoStore.getStudentForUser(req.params.id, req.user)
    if (!result) {
      return res.status(isTeacher(req.user) ? 404 : 403).json({ message: isTeacher(req.user) ? 'Student not found' : 'You can only access your own student record' })
    }

    return res.json(result)
  }

  try {
    const { id } = req.params
    if (!canAccessStudent(req.user, id)) {
      return res.status(403).json({ message: 'You can only access your own student record' })
    }

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

app.post('/api/students', requireRole('teacher'), async (req, res) => {
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

app.put('/api/students/:id', requireRole('teacher'), async (req, res) => {
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
    res.json(mapStudentWithSummary({ ...rows[0], average_grade: null, grade_count: 0 }))
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Student number already exists' })
    }

    res.status(500).json({ message: 'Failed to update student', error: error.message })
  }
})

app.delete('/api/students/:id', requireRole('teacher'), async (req, res) => {
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
    return res.json(demoStore.listGradesForUser(req.user, req.query.studentId))
  }

  try {
    const { studentId } = req.query
    const params = []
    let sql = 'SELECT * FROM grades'

    if (isTeacher(req.user) && studentId) {
      sql += ' WHERE student_id = ?'
      params.push(studentId)
    } else if (!isTeacher(req.user)) {
      sql += ' WHERE student_id = ?'
      params.push(req.user.studentId)
    }

    sql += ' ORDER BY created_at DESC'

    const [rows] = await pool.query(sql, params)
    res.json(rows.map(mapGradeRow))
  } catch (error) {
    res.status(500).json({ message: 'Failed to load grades', error: error.message })
  }
})

app.post('/api/grades', requireRole('teacher'), async (req, res) => {
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

app.delete('/api/grades/:id', requireRole('teacher'), async (req, res) => {
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

app.get('/api/dashboard', async (req, res) => {
  if (useDemoMode) {
    return res.json(demoStore.dashboard(req.user))
  }

  try {
    if (isTeacher(req.user)) {
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

      return res.json({
        role: 'teacher',
        totalStudents: Number(studentStats.totalStudents || 0),
        passingStudents: Number(studentStats.passingStudents || 0),
        totalGrades: Number(gradeStats.totalGrades || 0),
        averageScore: gradeStats.averageScore === null ? null : Number(gradeStats.averageScore),
        highestScore: gradeStats.highestScore === null ? null : Number(gradeStats.highestScore),
        lowestScore: gradeStats.lowestScore === null ? null : Number(gradeStats.lowestScore),
      })
    }

    const [[studentRow]] = await pool.query('SELECT * FROM students WHERE id = ?', [req.user.studentId])
    const [gradeRows] = await pool.query('SELECT * FROM grades WHERE student_id = ? ORDER BY created_at DESC', [req.user.studentId])
    const scores = gradeRows.map((grade) => Number(grade.score))
    const averageScore = scores.length ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2)) : null

    return res.json({
      role: 'student',
      totalStudents: studentRow ? 1 : 0,
      passingStudents: averageScore !== null && averageScore >= 50 ? 1 : 0,
      totalGrades: gradeRows.length,
      averageScore,
      highestScore: scores.length ? Math.max(...scores) : null,
      lowestScore: scores.length ? Math.min(...scores) : null,
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
