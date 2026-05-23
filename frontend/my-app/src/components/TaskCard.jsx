import React from 'react'

function TaskCard({ task, onToggleComplete, onDelete }) {
  return (
    <div className="task-card">
      <div className="task-header">
        <h3 className="task-title">{task.title}</h3>
        <span className={`task-status ${task.completed ? 'completed' : 'pending'}`}>
          {task.completed ? 'Completed' : 'Pending'}
        </span>
      </div>
      
      <p className="task-description">{task.description}</p>
      
      <div className="task-meta">
        <span className="task-course">{task.course}</span>
        <span className="task-deadline">Due: {task.deadline}</span>
      </div>
      
      <div className="task-actions">
        <button 
          className="btn toggle-btn" 
          onClick={() => onToggleComplete(task.id)}
        >
          {task.completed ? 'Mark Pending' : 'Mark Complete'}
        </button>
        <button 
          className="btn delete-btn" 
          onClick={() => onDelete(task.id)}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export default TaskCard