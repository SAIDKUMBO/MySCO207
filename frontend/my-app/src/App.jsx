import React, { useState } from 'react'
import TaskForm from './components/TaskForm'
import TaskList from './components/TaskList'
import './styles.css'

function App() {
  const [tasks, setTasks] = useState([])

  const addTask = (newTask) => {
    setTasks([...tasks, newTask])
  }

  const toggleComplete = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id))
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Student Planner</h1>
      </header>

      <main className="main">
        <div className="container">
          <TaskForm onAddTask={addTask} />
          <TaskList 
            tasks={tasks} 
            onToggleComplete={toggleComplete}
            onDelete={deleteTask}
          />
        </div>
      </main>
    </div>
  )
}

export default App