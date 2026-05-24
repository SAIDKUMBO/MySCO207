import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env'), override: true })

const SECRET = process.env.AUTH_SECRET || 'dev-secret'

export function createAuthToken(user){
  // keep a small payload
  const payload = { id: user.id, username: user.username, fullName: user.fullName, role: user.role, studentId: user.studentId }
  return jwt.sign(payload, SECRET)
}

export function requireAuth(req,res,next){
  const header = req.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if(!token) return res.status(401).json({ message: 'Authorization required' })
  try{
    const payload = jwt.verify(token, SECRET)
    req.user = payload
    next()
  }catch(e){
    return res.status(401).json({ message: 'Invalid token' })
  }
}

export function requireRole(role){
  return (req,res,next)=>{
    if(req.user && req.user.role === role) return next()
    return res.status(403).json({ message: 'Forbidden' })
  }
}
