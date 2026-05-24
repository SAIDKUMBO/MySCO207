const initialStudents = [
  {
    id: 1,
    studentNumber: 'STU-001',
    firstName: 'Amina',
    lastName: 'Mensah',
    className: 'Grade 10A',
    email: 'amina@example.com',
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    studentNumber: 'STU-002',
    firstName: 'Daniel',
    lastName: 'Owusu',
    className: 'Grade 11B',
    email: 'daniel@example.com',
    createdAt: new Date().toISOString(),
  },
]

const initialUsers = [
  {
    id: 1,
    username: 'teacher',
    password: 'teacher123',
    role: 'teacher',
    fullName: 'Teacher Admin',
    studentId: null,
  },
  {
    id: 2,
    username: 'amina',
    password: 'student123',
    role: 'student',
    fullName: 'Amina Mensah',
    studentId: 1,
  },
  {
    id: 3,
    username: 'daniel',
    password: 'student123',
    role: 'student',
    fullName: 'Daniel Owusu',
    studentId: 2,
  },
]

const initialGrades = [
  {
    id: 1,
    studentId: 1,
    subject: 'Mathematics',
    score: 84.5,
    term: 'Term 1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    studentId: 1,
    subject: 'English',
    score: 76,
    term: 'Term 1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    studentId: 2,
    subject: 'Science',
    score: 69,
    term: 'Term 1',
    createdAt: new Date().toISOString(),
  },
]

function cloneStudent(student, grades) {
  const studentGrades = grades.filter((grade) => grade.studentId === student.id)
  const averageGrade = studentGrades.length
    ? Number((studentGrades.reduce((sum, grade) => sum + grade.score, 0) / studentGrades.length).toFixed(2))
    : null

  return {
    id: student.id,
    studentNumber: student.studentNumber,
    firstName: student.firstName,
    lastName: student.lastName,
    fullName: `${student.firstName} ${student.lastName}`,
    className: student.className,
    email: student.email,
    createdAt: student.createdAt,
    averageGrade,
    gradeCount: studentGrades.length,
  }
}

function buildDashboard(students, grades) {
  const studentSnapshots = students.map((student) => cloneStudent(student, grades))
  const passingStudents = studentSnapshots.filter((student) => student.averageGrade !== null && student.averageGrade >= 50)
  const averageScore = grades.length
    ? Number((grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length).toFixed(2))
    : null

  return {
    totalStudents: students.length,
    passingStudents: passingStudents.length,
    totalGrades: grades.length,
    averageScore,
    highestScore: grades.length ? Math.max(...grades.map((grade) => grade.score)) : null,
    lowestScore: grades.length ? Math.min(...grades.map((grade) => grade.score)) : null,
  }
}

function serializeUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    studentId: user.studentId,
  }
}

function buildStudentGrades(grades, studentId) {
  return grades.filter((grade) => grade.studentId === Number(studentId))
}

export function createDemoStore() {
  let students = initialStudents.map((student) => ({ ...student }))
  let grades = initialGrades.map((grade) => ({ ...grade }))
  let users = initialUsers.map((user) => ({ ...user }))
  let nextStudentId = students.length + 1
  let nextGradeId = grades.length + 1

  return {
    health() {
      return { ok: true, database: 'demo' }
    },
    authenticate(username, password) {
      const user = users.find(
        (item) => item.username === username && item.password === password
      )

      return user ? serializeUser(user) : null
    },
    getMe(userId) {
      const user = users.find((item) => item.id === Number(userId))
      if (!user) {
        return null
      }

      const profile = serializeUser(user)
      if (user.role === 'student' && user.studentId) {
        const student = students.find((item) => item.id === Number(user.studentId))
        if (student) {
          profile.student = cloneStudent(student, grades)
        }
      }

      return profile
    },
    listStudents() {
      return students.map((student) => cloneStudent(student, grades))
    },
    listStudentsForUser(user) {
      if (user.role === 'teacher') {
        return students.map((student) => cloneStudent(student, grades))
      }

      const student = students.find((item) => item.id === Number(user.studentId))
      return student ? [cloneStudent(student, grades)] : []
    },
    getStudent(id) {
      const student = students.find((item) => item.id === Number(id))
      if (!student) {
        return null
      }

      const studentGrades = grades.filter((grade) => grade.studentId === student.id)
      return {
        student: cloneStudent(student, grades),
        grades: studentGrades.map((grade) => ({ ...grade })),
      }
    },
    getStudentForUser(id, user) {
      if (user.role === 'teacher' || Number(user.studentId) === Number(id)) {
        return this.getStudent(id)
      }

      return null
    },
    createStudent(payload) {
      if (students.some((student) => student.studentNumber === payload.studentNumber)) {
        const error = new Error('Student number already exists')
        error.code = 'ER_DUP_ENTRY'
        throw error
      }

      const student = {
        id: nextStudentId++,
        studentNumber: payload.studentNumber,
        firstName: payload.firstName,
        lastName: payload.lastName,
        className: payload.className,
        email: payload.email || null,
        createdAt: new Date().toISOString(),
      }

      students = [student, ...students]
      return cloneStudent(student, grades)
    },
    updateStudent(id, payload) {
      const numericId = Number(id)
      const existingStudent = students.find((student) => student.id === numericId)
      if (!existingStudent) {
        return null
      }

      const duplicateStudent = students.find(
        (student) => student.studentNumber === payload.studentNumber && student.id !== numericId
      )

      if (duplicateStudent) {
        const error = new Error('Student number already exists')
        error.code = 'ER_DUP_ENTRY'
        throw error
      }

      Object.assign(existingStudent, {
        studentNumber: payload.studentNumber,
        firstName: payload.firstName,
        lastName: payload.lastName,
        className: payload.className,
        email: payload.email || null,
      })

      return cloneStudent(existingStudent, grades)
    },
    deleteStudent(id) {
      const numericId = Number(id)
      const nextStudents = students.filter((student) => student.id !== numericId)
      if (nextStudents.length === students.length) {
        return false
      }

      students = nextStudents
      grades = grades.filter((grade) => grade.studentId !== numericId)
      return true
    },
    listGrades(studentId) {
      const filteredGrades = studentId
        ? grades.filter((grade) => grade.studentId === Number(studentId))
        : grades
      return filteredGrades.map((grade) => ({ ...grade }))
    },
    listGradesForUser(user, studentId) {
      if (user.role === 'teacher') {
        return this.listGrades(studentId)
      }

      return buildStudentGrades(grades, user.studentId).map((grade) => ({ ...grade }))
    },
    createGrade(payload) {
      const student = students.find((item) => item.id === Number(payload.studentId))
      if (!student) {
        return null
      }

      const grade = {
        id: nextGradeId++,
        studentId: Number(payload.studentId),
        subject: payload.subject,
        score: Number(payload.score),
        term: payload.term,
        createdAt: new Date().toISOString(),
      }

      grades = [grade, ...grades]
      return { ...grade }
    },
    deleteGrade(id) {
      const numericId = Number(id)
      const nextGrades = grades.filter((grade) => grade.id !== numericId)
      if (nextGrades.length === grades.length) {
        return false
      }

      grades = nextGrades
      return true
    },
    dashboard(user) {
      if (user.role === 'teacher') {
        return buildDashboard(students, grades)
      }

      const student = students.find((item) => item.id === Number(user.studentId))
      if (!student) {
        return {
          totalStudents: 0,
          passingStudents: 0,
          totalGrades: 0,
          averageScore: null,
          highestScore: null,
          lowestScore: null,
        }
      }

      const studentGrades = buildStudentGrades(grades, student.id)
      const averageScore = studentGrades.length
        ? Number((studentGrades.reduce((sum, grade) => sum + grade.score, 0) / studentGrades.length).toFixed(2))
        : null

      return {
        totalStudents: 1,
        passingStudents: averageScore !== null && averageScore >= 50 ? 1 : 0,
        totalGrades: studentGrades.length,
        averageScore,
        highestScore: studentGrades.length ? Math.max(...studentGrades.map((grade) => grade.score)) : null,
        lowestScore: studentGrades.length ? Math.min(...studentGrades.map((grade) => grade.score)) : null,
      }
    },
  }
}
