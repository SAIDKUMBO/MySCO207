import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from './db.js'
import { createAuthToken, requireAuth, requireRole } from './auth.js'

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'), override: true })

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const publicDir = path.join(__dirname, '..', 'frontend')
const port = Number(process.env.PORT || 3000)
const useDemoMode = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true'

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(publicDir))

app.get('/api/health', async (_req, res) => {
  if (useDemoMode) return res.json({ ok: true, database: 'demo' })
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true, database: 'connected' })
  } catch (err) {
    res.status(500).json({ ok: false, database: 'disconnected', error: err.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ message: 'username and password required' })
  if (useDemoMode) {
    // demo users
    const users = [
      { id: 1, username: 'teacher', password: 'teacher123', role: 'teacher', fullName: 'Teacher Admin', studentId: null },
      { id: 2, username: 'amina', password: 'student123', role: 'student', fullName: 'Amina Mensah', studentId: 1 },
    ]
    const u = users.find(x => x.username === username && x.password === password)
    if (!u) return res.status(401).json({ message: 'Invalid username or password' })
    return res.json({ token: createAuthToken(u), user: u })
  }

  try {
    const [rows] = await pool.query('SELECT u.id, u.username, u.password, u.full_name, u.role, u.student_id FROM users u WHERE u.username = ? LIMIT 1', [username.trim()])
    if (rows.length === 0 || rows[0].password !== password) return res.status(401).json({ message: 'Invalid username or password' })
    const user = { id: rows[0].id, username: rows[0].username, fullName: rows[0].full_name, role: rows[0].role, studentId: rows[0].student_id }
    return res.json({ token: createAuthToken(user), user })
  } catch (err) {
    return res.status(500).json({ message: 'Failed to login', error: err.message })
  }
})

app.get('/api/students', requireAuth, async (req, res) => {
  if (useDemoMode) return res.json([])
  try {
    const [rows] = await pool.query(`SELECT s.id, s.student_number, s.first_name, s.last_name, s.class_name, s.email, s.created_at FROM students s ORDER BY s.created_at DESC`)
    res.json(rows.map(r => ({ id: r.id, studentNumber: r.student_number, firstName: r.first_name, lastName: r.last_name, className: r.class_name, email: r.email, createdAt: r.created_at })))
  } catch (err) {
    res.status(500).json({ message: 'Failed to load students', error: err.message })
  }
})

// Grades endpoints
app.get('/api/grades', requireAuth, async (req, res) => {
  if (useDemoMode) {
    const demo = [
      { id: 1, studentId: 1, subject: 'Programming Fundamentals', score: 84.5, term: 'Term 1' },
    ]
    if (req.user.role === 'student') return res.json(demo.filter(d => d.studentId === req.user.studentId))
    if (req.user.role === 'teacher') return res.json(demo)
    return res.json([])
  }

  try {
    if (req.user.role === 'student') {
      const [rows] = await pool.query('SELECT id, student_id, subject, score, term, created_at FROM grades WHERE student_id = ? ORDER BY created_at DESC', [req.user.studentId])
      const out = rows.map(r => ({ id: r.id, studentId: r.student_id, subject: r.subject, score: Number(r.score), term: r.term, createdAt: r.created_at, grade: (r.score >= 90 ? 'A' : r.score >= 80 ? 'B' : r.score >= 70 ? 'C' : r.score >= 60 ? 'D' : 'F') }))
      return res.json(out)
    }

    if (req.user.role === 'teacher') {
      const studentId = req.query.studentId
      if (studentId) {
        const [rows] = await pool.query('SELECT id, student_id, subject, score, term, created_at FROM grades WHERE student_id = ? ORDER BY created_at DESC', [studentId])
        const out = rows.map(r => ({ id: r.id, studentId: r.student_id, subject: r.subject, score: Number(r.score), term: r.term, createdAt: r.created_at, grade: (r.score >= 90 ? 'A' : r.score >= 80 ? 'B' : r.score >= 70 ? 'C' : r.score >= 60 ? 'D' : 'F') }))
        return res.json(out)
      }
      const [rows] = await pool.query('SELECT g.id, g.student_id, s.first_name, s.last_name, g.subject, g.score, g.term, g.created_at FROM grades g JOIN students s ON s.id = g.student_id ORDER BY g.created_at DESC')
      const out = rows.map(r => ({ id: r.id, studentId: r.student_id, studentName: (r.first_name + ' ' + r.last_name), subject: r.subject, score: Number(r.score), term: r.term, createdAt: r.created_at, grade: (r.score >= 90 ? 'A' : r.score >= 80 ? 'B' : r.score >= 70 ? 'C' : r.score >= 60 ? 'D' : 'F') }))
      return res.json(out)
    }

    return res.status(403).json({ message: 'Forbidden' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to load grades', error: err.message })
  }
})

app.get('/api/my/grades', requireAuth, async (req, res) => {
  if (useDemoMode) return res.json([])
  if (!req.user || !req.user.studentId) return res.status(403).json({ message: 'Forbidden' })
  try {
    const [rows] = await pool.query('SELECT id, student_id, subject, score, term, created_at FROM grades WHERE student_id = ? ORDER BY created_at DESC', [req.user.studentId])
    const out = rows.map(r => ({ id: r.id, studentId: r.student_id, subject: r.subject, score: Number(r.score), term: r.term, createdAt: r.created_at, grade: (r.score >= 90 ? 'A' : r.score >= 80 ? 'B' : r.score >= 70 ? 'C' : r.score >= 60 ? 'D' : 'F') }))
    res.json(out)
  } catch (err) {
    res.status(500).json({ message: 'Failed to load grades', error: err.message })
  }
})

app.post('/api/grades', requireAuth, requireRole('teacher'), async (req, res) => {
  const { studentId, subject, score, term } = req.body
  if (!studentId || !subject || typeof score === 'undefined' || !term) return res.status(400).json({ message: 'studentId, subject, score and term are required' })
  try {
    const [result] = await pool.query('INSERT INTO grades (student_id, subject, score, term) VALUES (?,?,?,?)', [studentId, subject, Number(score), term])
    const [rows] = await pool.query('SELECT id, student_id, subject, score, term, created_at FROM grades WHERE id = ? LIMIT 1', [result.insertId])
    if (rows.length === 0) return res.status(500).json({ message: 'Failed to fetch created grade' })
    const r = rows[0]
    const out = { id: r.id, studentId: r.student_id, subject: r.subject, score: Number(r.score), term: r.term, createdAt: r.created_at, grade: (r.score >= 90 ? 'A' : r.score >= 80 ? 'B' : r.score >= 70 ? 'C' : r.score >= 60 ? 'D' : 'F') }
    res.status(201).json(out)
  } catch (err) {
    res.status(500).json({ message: 'Failed to save grade', error: err.message })
  }
})

app.listen(port, () => {
  console.log(`Student portal server running on http://localhost:${port}`)
})
