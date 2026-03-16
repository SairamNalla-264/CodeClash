import { useCallback, useEffect, useState } from 'react'
import './ManageProblems.css'
import { apiUrl } from '../../config/env'

const EMPTY_LANGUAGE_MAP = {
  javascript: '',
  python: '',
  java: '',
  cpp: ''
}

const createEmptyForm = () => ({
  title: '',
  difficulty: 'Easy',
  topics: '',
  companies: '',
  description: '',
  constraints: '',
  examples: '',
  visibleTestCases: '',
  hiddenTestCases: '',
  starterCode: { ...EMPTY_LANGUAGE_MAP },
  driverCode: { ...EMPTY_LANGUAGE_MAP }
})

const parseDelimitedRows = (value, minimumParts) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter((parts) => parts.length >= minimumParts)

const serializeExamples = (examples = []) =>
  examples
    .map((example) => [example.input, example.output, example.explanation || ''].join(' | '))
    .join('\n')

const serializeTestCases = (testCases = []) =>
  testCases
    .map((testCase) => `${testCase.input} | ${testCase.output}`)
    .join('\n')

const toPlainMap = (value = {}) => {
  const plain = { ...EMPTY_LANGUAGE_MAP }
  if (!value) return plain

  Object.keys(EMPTY_LANGUAGE_MAP).forEach((language) => {
    if (typeof value.get === 'function') {
      plain[language] = value.get(language) || ''
    } else {
      plain[language] = value[language] || ''
    }
  })

  return plain
}

const ManageProblems = () => {
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingProblemId, setEditingProblemId] = useState(null)
  const [form, setForm] = useState(createEmptyForm())

  const token = localStorage.getItem('token')

  const fetchProblems = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/admin/problems'), {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setProblems(data)
    } catch {
      alert('Failed to load problems')
    } finally {
      setLoading(false)
    }
  }, [token])

  const resetForm = () => {
    setEditingProblemId(null)
    setForm(createEmptyForm())
  }

  const buildPayload = () => {
    const parsedExamples = parseDelimitedRows(form.examples, 2).map(([input, output, explanation = '']) => ({
      input,
      output,
      explanation
    }))

    const parsedVisibleTests = parseDelimitedRows(form.visibleTestCases, 2).map(([input, output]) => ({ input, output }))
    const parsedHiddenTests = parseDelimitedRows(form.hiddenTestCases, 2).map(([input, output]) => ({ input, output }))

    if (parsedExamples.length === 0) {
      throw new Error('Add at least one example using input | output | optional explanation.')
    }

    if (parsedVisibleTests.length === 0 || parsedHiddenTests.length === 0) {
      throw new Error('Add at least one visible and one hidden test case using input | output.')
    }

    return {
      title: form.title.trim(),
      difficulty: form.difficulty,
      topics: form.topics.split(',').map((value) => value.trim()).filter(Boolean),
      companies: form.companies.split(',').map((value) => value.trim()).filter(Boolean),
      description: form.description.trim(),
      constraints: form.constraints.split('\n').map((value) => value.trim()).filter(Boolean),
      examples: parsedExamples,
      visibleTestCases: parsedVisibleTests,
      hiddenTestCases: parsedHiddenTests,
      starterCode: form.starterCode,
      driverCode: form.driverCode
    }
  }

  const saveProblem = async (e) => {
    e.preventDefault()

    let payload
    try {
      payload = buildPayload()
    } catch (err) {
      alert(err.message)
      return
    }

    const isEditing = Boolean(editingProblemId)
    const url = isEditing
      ? apiUrl(`/api/admin/problems/${editingProblemId}`)
      : apiUrl('/api/admin/problems')

    try {
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.message || `Failed to ${isEditing ? 'update' : 'create'} problem`)
        return
      }

      resetForm()
      fetchProblems()
    } catch {
      alert('Server error')
    }
  }

  const startEditing = async (id) => {
    try {
      const res = await fetch(apiUrl(`/api/admin/problems/${id}`), {
        headers: { Authorization: `Bearer ${token}` }
      })
      const problem = await res.json()
      if (!res.ok) {
        alert(problem.message || 'Failed to load problem')
        return
      }

      setEditingProblemId(problem._id)
      setForm({
        title: problem.title || '',
        difficulty: problem.difficulty || 'Easy',
        topics: (problem.topics || []).join(', '),
        companies: (problem.companies || []).join(', '),
        description: problem.description || '',
        constraints: (problem.constraints || []).join('\n'),
        examples: serializeExamples(problem.examples),
        visibleTestCases: serializeTestCases(problem.visibleTestCases),
        hiddenTestCases: serializeTestCases(problem.hiddenTestCases),
        starterCode: toPlainMap(problem.starterCode),
        driverCode: toPlainMap(problem.driverCode)
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      alert('Failed to load problem')
    }
  }

  const deleteProblem = async (id) => {
    if (!window.confirm('Delete this problem?')) return
    try {
      const res = await fetch(apiUrl(`/api/admin/problems/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.message || 'Failed to delete problem')
        return
      }

      setProblems((prev) => prev.filter((problem) => problem._id !== id))
      if (editingProblemId === id) {
        resetForm()
      }
    } catch {
      alert('Failed to delete problem')
    }
  }

  useEffect(() => { fetchProblems() }, [fetchProblems])

  if (loading) return <div className="loading-screen">Forging database connections...</div>

  return (
    <div className="manage-problems">
      <h2>Challenge Management</h2>

      <form className="problem-form" onSubmit={saveProblem}>
        <h3>{editingProblemId ? 'Edit Problem' : 'Forge New Problem'}</h3>
        <input
          placeholder="Problem Title"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          required
        />
        <select
          value={form.difficulty}
          onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))}
        >
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>
        <input
          placeholder="Topics (comma separated)"
          value={form.topics}
          onChange={(e) => setForm((prev) => ({ ...prev, topics: e.target.value }))}
        />
        <input
          placeholder="Companies (comma separated)"
          value={form.companies}
          onChange={(e) => setForm((prev) => ({ ...prev, companies: e.target.value }))}
        />
        <textarea
          placeholder="Description (supports Markdown)"
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          required
        />
        <textarea
          placeholder="Constraints (one per line)"
          value={form.constraints}
          onChange={(e) => setForm((prev) => ({ ...prev, constraints: e.target.value }))}
        />
        <textarea
          placeholder="Examples: input | output | optional explanation"
          value={form.examples}
          onChange={(e) => setForm((prev) => ({ ...prev, examples: e.target.value }))}
        />
        <textarea
          placeholder="Visible test cases: input | output"
          value={form.visibleTestCases}
          onChange={(e) => setForm((prev) => ({ ...prev, visibleTestCases: e.target.value }))}
        />
        <textarea
          placeholder="Hidden test cases: input | output"
          value={form.hiddenTestCases}
          onChange={(e) => setForm((prev) => ({ ...prev, hiddenTestCases: e.target.value }))}
        />

        {Object.keys(EMPTY_LANGUAGE_MAP).map((language) => (
          <div key={language} className="code-block">
            <h4 style={{ marginBottom: '8px' }}>{language.toUpperCase()} Starter Code</h4>
            <textarea
              placeholder={`${language} starter code`}
              value={form.starterCode[language]}
              onChange={(e) => setForm((prev) => ({
                ...prev,
                starterCode: { ...prev.starterCode, [language]: e.target.value }
              }))}
            />
            <h4 style={{ marginBottom: '8px' }}>{language.toUpperCase()} Driver Code</h4>
            <textarea
              placeholder={`${language} driver code`}
              value={form.driverCode[language]}
              onChange={(e) => setForm((prev) => ({
                ...prev,
                driverCode: { ...prev.driverCode, [language]: e.target.value }
              }))}
            />
          </div>
        ))}

        <div className="problem-form-actions">
          <button type="submit">{editingProblemId ? 'UPDATE PROBLEM' : 'PUBLISH CHALLENGE'}</button>
          {editingProblemId && (
            <button type="button" className="secondary-btn" onClick={resetForm}>
              CANCEL EDIT
            </button>
          )}
        </div>
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
            {problems.map((problem) => (
              <tr key={problem._id}>
                <td style={{ fontWeight: 600 }}>{problem.title}</td>
                <td className={`diff ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</td>
                <td style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{problem.topics.join(', ')}</td>
                <td className="problem-actions">
                  <button className="edit-btn" onClick={() => startEditing(problem._id)}>Edit</button>
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
