import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import mysql from 'mysql2/promise'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const schemaPath = path.join(__dirname, '..', 'schema.sql')
const schema = fs.readFileSync(schemaPath, 'utf8')

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: Number(process.env.DB_PORT || 3306),
  multipleStatements: true,
}

async function init(){
  const connection = await mysql.createConnection(config)
  try{
    await connection.query(schema)
    console.log('Database schema created successfully')
  }finally{
    await connection.end()
  }
}

init().catch((error)=>{
  console.error('Database initialization failed:')
  console.error(error.message)
  process.exit(1)
})
