const apiBase = ''

const elements = {
  connectionDot: document.getElementById('connectionDot'),
  connectionStatus: document.getElementById('connectionStatus'),
  totalStudents: document.getElementById('totalStudents'),
  totalGrades: document.getElementById('totalGrades'),
  averageScore: document.getElementById('averageScore'),
  passingStudents: document.getElementById('passingStudents'),
  studentCountPill: document.getElementById('studentCountPill'),
  selectedStudentPill: document.getElementById('selectedStudentPill'),
  studentDetail: document.getElementById('studentDetail'),
  studentsTableBody: document.getElementById('studentsTableBody'),
  gradesTableBody: document.getElementById('gradesTableBody'),
  studentForm: document.getElementById('studentForm'),
  studentId: document.getElementById('studentId'),
  studentNumber: document.getElementById('studentNumber'),
  firstName: document.getElementById('firstName'),
  lastName: document.getElementById('lastName'),
  className: document.getElementById('className'),
  email: document.getElementById('email'),
  studentFormLabel: document.getElementById('studentFormLabel'),
  studentSubmitBtn: document.getElementById('studentSubmitBtn'),
  resetStudentForm: document.getElementById('resetStudentForm'),
  gradeForm: document.getElementById('gradeForm'),
  subject: document.getElementById('subject'),
  score: document.getElementById('score'),
  term: document.getElementById('term'),
  toast: document.getElementById('toast'),
}

const state = {
  students: [],
  selectedStudentId: null,
  editingStudentId: null,
  selectedStudentGrades: [],
}

function formatScore(score) {
  return Number.isInteger(score) ? `${score}` : score.toFixed(2)
}

function showToast(message) {
  elements.toast.textContent = message
  elements.toast.classList.add('show')
  window.clearTimeout(showToast.timer)
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove('show')
  }, 2600)
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed')
  }

  return payload
}

function resetStudentForm() {
  state.editingStudentId = null
  elements.studentForm.reset()
  elements.studentId.value = ''
  elements.studentFormLabel.textContent = 'Add student'
  elements.studentSubmitBtn.textContent = 'Save student'
}

function fillStudentForm(student) {
  state.editingStudentId = student.id
  elements.studentId.value = student.id
  elements.studentNumber.value = student.studentNumber
  elements.firstName.value = student.firstName
  elements.lastName.value = student.lastName
  elements.className.value = student.className
  elements.email.value = student.email || ''
  elements.studentFormLabel.textContent = 'Edit student'
  elements.studentSubmitBtn.textContent = 'Update student'
}

function renderDashboard(dashboard) {
  elements.totalStudents.textContent = dashboard.totalStudents
  elements.totalGrades.textContent = dashboard.totalGrades
  elements.averageScore.textContent = dashboard.averageScore === null ? '0' : dashboard.averageScore.toFixed(2)
  elements.passingStudents.textContent = dashboard.passingStudents
}

function renderStudents() {
  elements.studentsTableBody.innerHTML = ''
  elements.studentCountPill.textContent = `${state.students.length} record${state.students.length === 1 ? '' : 's'}`

  if (state.students.length === 0) {
    elements.studentsTableBody.innerHTML = '<tr><td colspan="5" class="empty-cell">No students available. Add the first one.</td></tr>'
    return
  }

  for (const student of state.students) {
    const row = document.createElement('tr')
    row.innerHTML = `
      <td>
        <strong>${student.fullName}</strong><br />
        <span class="muted">${student.studentNumber}</span>
      </td>
      <td>${student.className}</td>
      <td>${student.averageGrade === null ? 'N/A' : student.averageGrade.toFixed(2)}</td>
      <td>${student.gradeCount}</td>
      <td>
        <div class="actions">
          <button class="icon-btn" data-action="view" data-id="${student.id}">View</button>
          <button class="icon-btn" data-action="edit" data-id="${student.id}">Edit</button>
          <button class="icon-btn danger" data-action="delete" data-id="${student.id}">Delete</button>
        </div>
      </td>
    `
    elements.studentsTableBody.appendChild(row)
  }
}

function renderSelectedStudent(student, grades) {
  if (!student) {
    elements.selectedStudentPill.textContent = 'No student selected'
    elements.studentDetail.innerHTML = '<p class="muted">Select a student from the list to view their grades and add new ones.</p>'
    elements.gradesTableBody.innerHTML = '<tr><td colspan="4" class="empty-cell">No grades loaded yet.</td></tr>'
    return
  }

  elements.selectedStudentPill.textContent = `${student.fullName} · ${student.className}`
  elements.studentDetail.innerHTML = `
    <h3>${student.fullName}</h3>
    <div class="meta-grid">
      <span><strong>Student No:</strong> ${student.studentNumber}</span>
      <span><strong>Class:</strong> ${student.className}</span>
      <span><strong>Email:</strong> ${student.email || 'Not provided'}</span>
      <span><strong>Average grade:</strong> ${student.averageGrade === null ? 'N/A' : student.averageGrade.toFixed(2)}</span>
    </div>
  `

  elements.gradesTableBody.innerHTML = ''
  if (grades.length === 0) {
    elements.gradesTableBody.innerHTML = '<tr><td colspan="4" class="empty-cell">This student has no grades yet.</td></tr>'
    return
  }

  for (const grade of grades) {
    const row = document.createElement('tr')
    row.innerHTML = `
      <td>${grade.subject}</td>
      <td>${grade.term}</td>
      <td>${formatScore(grade.score)}</td>
      <td><button class="icon-btn danger" data-grade-id="${grade.id}">Delete</button></td>
    `
    elements.gradesTableBody.appendChild(row)
  }
}

async function loadDashboard() {
  try {
    const dashboard = await request('/api/dashboard')
    renderDashboard(dashboard)
  } catch (error) {
    showToast(error.message)
  }
}

async function loadStudents(preferredStudentId = state.selectedStudentId) {
  const students = await request('/api/students')
  state.students = students
  renderStudents()

  if (students.length === 0) {
    state.selectedStudentId = null
    renderSelectedStudent(null, [])
    return
  }

  const nextSelectedId = preferredStudentId && students.some((student) => student.id === preferredStudentId)
    ? preferredStudentId
    : students[0].id

  await selectStudent(nextSelectedId, { silent: true })
}

async function selectStudent(studentId, options = {}) {
  if (!studentId) {
    state.selectedStudentId = null
    renderSelectedStudent(null, [])
    return
  }

  const result = await request(`/api/students/${studentId}`)
  state.selectedStudentId = result.student.id
  state.selectedStudentGrades = result.grades
  renderSelectedStudent(result.student, result.grades)

  if (!options.silent) {
    showToast(`Loaded ${result.student.fullName}`)
  }
}

async function handleStudentSubmit(event) {
  event.preventDefault()

  const payload = {
    studentNumber: elements.studentNumber.value.trim(),
    firstName: elements.firstName.value.trim(),
    lastName: elements.lastName.value.trim(),
    className: elements.className.value.trim(),
    email: elements.email.value.trim(),
  }

  try {
    if (state.editingStudentId) {
      await request(`/api/students/${state.editingStudentId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      showToast('Student updated')
    } else {
      await request('/api/students', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      showToast('Student added')
    }

    resetStudentForm()
    await loadStudents()
    await loadDashboard()
  } catch (error) {
    showToast(error.message)
  }
}

async function handleGradeSubmit(event) {
  event.preventDefault()

  if (!state.selectedStudentId) {
    showToast('Select a student first')
    return
  }

  const payload = {
    studentId: state.selectedStudentId,
    subject: elements.subject.value.trim(),
    score: Number(elements.score.value),
    term: elements.term.value.trim(),
  }

  try {
    await request('/api/grades', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    elements.gradeForm.reset()
    showToast('Grade added')
    await loadStudents(state.selectedStudentId)
    await loadDashboard()
  } catch (error) {
    showToast(error.message)
  }
}

async function handleStudentActions(event) {
  const button = event.target.closest('button')
  if (!button) {
    return
  }

  const studentId = Number(button.dataset.id)
  const action = button.dataset.action

  try {
    if (action === 'view') {
      await selectStudent(studentId)
      return
    }

    if (action === 'edit') {
      const student = state.students.find((item) => item.id === studentId)
      if (student) {
        fillStudentForm(student)
      }
      return
    }

    if (action === 'delete') {
      const student = state.students.find((item) => item.id === studentId)
      const confirmed = window.confirm(`Delete ${student?.fullName || 'this student'}? This also removes their grades.`)
      if (!confirmed) {
        return
      }

      await request(`/api/students/${studentId}`, { method: 'DELETE' })
      showToast('Student deleted')

      if (state.selectedStudentId === studentId) {
        state.selectedStudentId = null
      }

      await loadStudents()
      await loadDashboard()
    }
  } catch (error) {
    showToast(error.message)
  }
}

async function handleGradeActions(event) {
  const button = event.target.closest('button[data-grade-id]')
  if (!button) {
    return
  }

  const confirmed = window.confirm('Delete this grade?')
  if (!confirmed) {
    return
  }

  try {
    await request(`/api/grades/${button.dataset.gradeId}`, { method: 'DELETE' })
    showToast('Grade deleted')
    await loadStudents(state.selectedStudentId)
    await loadDashboard()
  } catch (error) {
    showToast(error.message)
  }
}

async function initialize() {
  elements.connectionStatus.textContent = 'Connecting to database...'

  try {
    await request('/api/health')
    elements.connectionDot.classList.add('online')
    elements.connectionStatus.textContent = 'Database connected'
  } catch (error) {
    elements.connectionDot.classList.add('offline')
    elements.connectionStatus.textContent = 'Database unavailable'
    showToast('Check your MySQL connection settings')
  }

  await loadDashboard()
  await loadStudents()
}

elements.studentForm.addEventListener('submit', handleStudentSubmit)
elements.gradeForm.addEventListener('submit', handleGradeSubmit)
elements.studentsTableBody.addEventListener('click', handleStudentActions)
elements.gradesTableBody.addEventListener('click', handleGradeActions)
elements.resetStudentForm.addEventListener('click', resetStudentForm)

initialize().catch((error) => {
  elements.connectionDot.classList.add('offline')
  elements.connectionStatus.textContent = 'Failed to load portal'
  showToast(error.message)
})