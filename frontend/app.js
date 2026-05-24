// Simple static student portal (no backend). Data persisted to localStorage.
(function(){
  const STORAGE_KEY = 'sco207-demo-data-v1'

  const DEFAULT = {
    users:[
      {id:1,username:'teacher',password:'teacher123',role:'teacher',fullName:'Teacher Admin',studentId:null},
      {id:2,username:'amina',password:'student123',role:'student',fullName:'Amina Mensah',studentId:1},
      {id:3,username:'daniel',password:'student123',role:'student',fullName:'Daniel Owusu',studentId:2}
    ],
    students:[
      {id:1,studentNumber:'STU-001',firstName:'Amina',lastName:'Mensah',className:'Grade 10A',email:'amina@example.com',grades:[{id:1,subject:'Programming Fundamentals',score:84.5,term:'Term 1'},{id:2,subject:'Data Structures',score:76,term:'Term 1'},{id:3,subject:'Database Systems',score:91,term:'Term 1'}]},
      {id:2,studentNumber:'STU-002',firstName:'Daniel',lastName:'Owusu',className:'Grade 11B',email:'daniel@example.com',grades:[{id:4,subject:'Computer Systems',score:69,term:'Term 1'},{id:5,subject:'Web Development',score:88,term:'Term 1'},{id:6,subject:'Software Engineering',score:82,term:'Term 1'}]}
    ]
  }

  // state
  let state = load()
  let currentUser = null

  // DOM
  const authPanel = document.getElementById('authPanel')
  const loginForm = document.getElementById('loginForm')
  const loginUsername = document.getElementById('loginUsername')
  const loginPassword = document.getElementById('loginPassword')
  const logoutBtn = document.getElementById('logoutBtn')
  const rolePill = document.getElementById('rolePill')
  const userPill = document.getElementById('userPill')
  const dashboardShell = document.getElementById('dashboardShell')
  const studentsList = document.getElementById('studentsList')
  const studentCardTpl = document.getElementById('studentCardTpl')
  const addStudentBtn = document.getElementById('addStudentBtn')
  const demoResetBtn = document.getElementById('demoResetBtn')
  const modal = document.getElementById('modal')
  const modalBody = document.getElementById('modalBody')
  const modalClose = document.getElementById('modalClose')

  // events
  loginForm.addEventListener('submit', onLogin)
  logoutBtn.addEventListener('click', onLogout)
  demoResetBtn.addEventListener('click', ()=>{ if(confirm('Reset demo data?')){ state = DEFAULT; save(); render(); } })
  addStudentBtn.addEventListener('click', ()=> openStudentForm())
  modalClose.addEventListener('click', closeModal)
  modal.addEventListener('click', (e)=> { if(e.target===modal) closeModal() })

  // init
  render()

  // persistence
  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY)
      if(!raw) return deepClone(DEFAULT)
      return JSON.parse(raw)
    }catch(e){return deepClone(DEFAULT)}
  }
  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }
  function deepClone(v){ return JSON.parse(JSON.stringify(v)) }

  // auth
  function onLogin(e){
    e.preventDefault()
    const u = loginUsername.value.trim()
    const p = loginPassword.value
    const user = state.users.find(x=> x.username===u && x.password===p)
    if(!user){alert('Invalid username or password'); return}
    currentUser = user
    render()
  }
  function onLogout(){ currentUser = null; render() }

  // render
  function render(){
    const signedIn = !!currentUser
    authPanel.hidden = signedIn
    dashboardShell.hidden = !signedIn
    logoutBtn.hidden = !signedIn
    rolePill.textContent = signedIn ? currentUser.role : 'Guest'
    userPill.textContent = signedIn ? currentUser.fullName : 'Not signed in'

    const isTeacher = signedIn && currentUser.role==='teacher'
    addStudentBtn.hidden = !isTeacher

    renderStudents()
  }

  function renderStudents(){
    studentsList.innerHTML = ''
    const rows = currentUser && currentUser.role==='student'
      ? state.students.filter(s=> s.id===currentUser.studentId)
      : state.students.slice().sort((a,b)=> b.id - a.id)

    rows.forEach(s=>{
      const el = studentCardTpl.content.cloneNode(true)
      const article = el.querySelector('.student-card')
      article.dataset.id = s.id
      article.querySelector('.student-name').textContent = s.firstName + ' ' + s.lastName
      article.querySelector('.student-meta').textContent = `${s.studentNumber} · ${s.className}`
      const viewBtn = article.querySelector('.view-btn')
      const editBtn = article.querySelector('.edit-btn')
      const delBtn = article.querySelector('.delete-btn')
      viewBtn.addEventListener('click', ()=> openStudentView(s.id))
      if(currentUser && currentUser.role==='teacher'){
        editBtn.hidden = false
        delBtn.hidden = false
        editBtn.addEventListener('click', ()=> openStudentForm(s.id))
        delBtn.addEventListener('click', ()=> { if(confirm('Delete student?')){ deleteStudent(s.id) } })
      }
      studentsList.appendChild(el)
    })
  }

  // student operations
  function openStudentView(id){
    const s = state.students.find(x=> x.id===id)
    if(!s) return
    modalBody.innerHTML = ''
    const root = document.createElement('div')
    root.innerHTML = `
      <h3>${s.firstName} ${s.lastName}</h3>
      <div class="student-details">
        <div>
          <p><strong>Student number:</strong> ${s.studentNumber}</p>
          <p><strong>Class:</strong> ${s.className}</p>
          <p><strong>Email:</strong> ${s.email || '<span class="muted">—</span>'}</p>
          <div class="grades-list"><h4>Grades</h4></div>
        </div>
        <div>
          <p><strong>Average:</strong> ${computeAverage(s).toFixed(2)}</p>
          <p><strong>Count:</strong> ${s.grades.length}</p>
          ${currentUser && currentUser.role==='teacher' ? '<button id="addGradeBtn" class="primary-btn">Add grade</button>' : ''}
        </div>
      </div>
    `
    modalBody.appendChild(root)
    const gradesList = root.querySelector('.grades-list')
    s.grades.forEach(g=>{
      const row = document.createElement('div')
      row.className = 'grade-row'
      row.innerHTML = `<div>${g.subject} — ${g.term}</div><div>${g.score}${currentUser && currentUser.role==='teacher' ? ' <button class="small-del">Delete</button>' : ''}</div>`
      const del = row.querySelector('.small-del')
      if(del) del.addEventListener('click', ()=>{ if(confirm('Delete grade?')){ deleteGrade(id,g.id); openStudentView(id) } })
      gradesList.appendChild(row)
    })
    const addGradeBtn = root.querySelector('#addGradeBtn')
    if(addGradeBtn) addGradeBtn.addEventListener('click', ()=> openGradeForm(id))
    openModal()
  }

  function openStudentForm(id){
    const editing = typeof id === 'number'
    const s = editing ? state.students.find(x=> x.id===id) : {studentNumber:'',firstName:'',lastName:'',className:'',email:''}
    modalBody.innerHTML = ''
    const form = document.createElement('form')
    form.innerHTML = `
      <h3>${editing ? 'Edit student' : 'Add student'}</h3>
      <label>Student number<input name="studentNumber" required value="${escapeHtml(s.studentNumber||'')}" /></label>
      <label>First name<input name="firstName" required value="${escapeHtml(s.firstName||'')}" /></label>
      <label>Last name<input name="lastName" required value="${escapeHtml(s.lastName||'')}" /></label>
      <label>Class<input name="className" required value="${escapeHtml(s.className||'')}" /></label>
      <label>Email<input name="email" type="email" value="${escapeHtml(s.email||'')}" /></label>
      <div style="margin-top:10px"><button class="primary-btn" type="submit">Save</button></div>
    `
    form.addEventListener('submit', (e)=>{
      e.preventDefault()
      const fd = new FormData(form)
      const obj = {studentNumber:fd.get('studentNumber').trim(),firstName:fd.get('firstName').trim(),lastName:fd.get('lastName').trim(),className:fd.get('className').trim(),email:fd.get('email').trim()}
      if(editing){ Object.assign(s,obj); save(); render(); closeModal(); return }
      const nextId = (state.students.reduce((m,x)=> Math.max(m,x.id),0) || 0) + 1
      const newStudent = {id:nextId,grades:[],...obj}
      state.students.push(newStudent)
      save(); render(); closeModal()
    })
    modalBody.appendChild(form)
    openModal()
  }

  function openGradeForm(studentId){
    const s = state.students.find(x=> x.id===studentId)
    if(!s) return
    modalBody.innerHTML = ''
    const form = document.createElement('form')
    form.innerHTML = `
      <h3>Add grade for ${s.firstName} ${s.lastName}</h3>
      <label>Subject<input name="subject" required /></label>
      <label>Score<input name="score" type="number" step="0.01" min="0" max="100" required /></label>
      <label>Term<input name="term" required value="Term 1" /></label>
      <div style="margin-top:10px"><button class="primary-btn" type="submit">Add</button></div>
    `
    form.addEventListener('submit', (e)=>{
      e.preventDefault()
      const fd = new FormData(form)
      const g = {id: (state.students.flatMap(s=>s.grades).reduce((m,x)=>Math.max(m,x.id||0),0) || 0) +1, subject:fd.get('subject').trim(), score: Number(fd.get('score')), term:fd.get('term').trim()}
      s.grades.push(g); save(); render(); openStudentView(studentId)
    })
    modalBody.appendChild(form)
    openModal()
  }

  function deleteStudent(id){
    state.students = state.students.filter(x=> x.id!==id)
    // remove any users tied to this student
    state.users.forEach(u=> { if(u.studentId===id) u.studentId = null })
    save(); render()
  }
  function deleteGrade(studentId,gradeId){
    const s = state.students.find(x=> x.id===studentId)
    if(!s) return
    s.grades = s.grades.filter(g=> g.id!==gradeId)
    save(); render()
  }

  function computeAverage(s){ if(!s.grades || s.grades.length===0) return 0; return s.grades.reduce((m,g)=> m+Number(g.score),0)/s.grades.length }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

  // modal
  function openModal(){ modal.hidden = false }
  function closeModal(){ modal.hidden = true; modalBody.innerHTML = '' }

  // helper: authenticated actions
  // if user data exists in URL query (for convenience) restore; otherwise expect login

  // expose for debugging
  window.__sco207 = {state,save}

})()
