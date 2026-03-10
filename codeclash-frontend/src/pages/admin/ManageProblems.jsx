import { useEffect, useState } from 'react'
import './ManageProblems.css'

const ManageProblems = () => {
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form state
  const [title, setTitle] = useState('')
  const [difficulty, setDifficulty] = useState('Easy')
  const [topics, setTopics] = useState('')
  const [description, setDescription] = useState('')
  const [constraints, setConstraints] = useState('')
  const [examples, setExamples] = useState('')

  const token = localStorage.getItem('token')

  const fetchProblems = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/problems', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setProblems(data)
    } catch {
      setError('Failed to load problems')
    } finally {
      setLoading(false)
    }
  }

  const createProblem = async (e) => {
    e.preventDefault()

    const parsedExamples = examples
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.includes('|'))
      .map(line => {
        const [input, output] = line.split('|')
        return { input: input.trim(), output: output.trim() }
      })

    if (parsedExamples.length === 0) {
      alert('Please add at least one valid example (input | output)')
      return
    }

    const payload = {
      title: title.trim(),
      difficulty,
      topics: topics.split(',').map(t => t.trim()).filter(Boolean),
      description: description.trim(),
      constraints: constraints.split('\n').map(c => c.trim()).filter(Boolean),
      examples: parsedExamples
    }

    try {
      const res = await fetch('http://localhost:5000/api/admin/problems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setTitle(''); setDifficulty('Easy'); setTopics(''); setDescription(''); setConstraints(''); setExamples('')
        fetchProblems()
      } else {
        alert('Failed to create problem')
      }
    } catch (err) {
      alert('Server error')
    }
  }

  const deleteProblem = async (id) => {
    if (!window.confirm('Delete this problem?')) return
    try {
      await fetch(`http://localhost:5000/api/admin/problems/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      setProblems(prev => prev.filter(p => p._id !== id))
    } catch {
      alert('Failed to delete problem')
    }
  }

  useEffect(() => { fetchProblems() }, [])

  if (loading) return <div className="loading-screen">Forging database connections...</div>

  return (
    <div className="manage-problems">
      <h2>Challenge Management</h2>

      <form className="problem-form" onSubmit={createProblem}>
        <h3>Forge New Problem</h3>
        <input placeholder="Problem Title" value={title} onChange={e => setTitle(e.target.value)} required />
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
          <option>Easy</option><option>Medium</option><option>Hard</option>
        </select>
        <input placeholder="Topics (e.g. Array, Strings)" value={topics} onChange={e => setTopics(e.target.value)} />
        <textarea placeholder="Description (Supports Markdown)" value={description} onChange={e => setDescription(e.target.value)} required />
        <textarea placeholder="Constraints (One per line)" value={constraints} onChange={e => setConstraints(e.target.value)} />
        <textarea placeholder="Examples (input | output)" value={examples} onChange={e => setExamples(e.target.value)} />
        <button type="submit">PUBLISH CHALLENGE</button>
      </form>

      <div className="problems-table-wrapper">
        <table className="problems-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Difficulty</th>
              <th>Topics</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {problems.map(problem => (
              <tr key={problem._id}>
                <td style={{ fontWeight: 600 }}>{problem.title}</td>
                <td className={`diff ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</td>
                <td style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{problem.topics.join(', ')}</td>
                <td>
                  <button className="delete-btn" onClick={() => deleteProblem(problem._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ManageProblems
