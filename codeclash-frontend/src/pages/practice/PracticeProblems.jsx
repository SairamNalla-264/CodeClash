import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './PracticeProblems.css'
import { apiUrl } from '../../config/env'

const getSolvedProblemIds = (user) => new Set((user?.solvedProblems || []).map(String))

const PracticeProblems = () => {
  const navigate = useNavigate()
  const cachedUser = JSON.parse(localStorage.getItem('user') || 'null')

  const [problems, setProblems] = useState([])
  const [filtered, setFiltered] = useState([])
  const [difficulty, setDifficulty] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [solvedProblemIds, setSolvedProblemIds] = useState(getSolvedProblemIds(cachedUser))

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const token = localStorage.getItem('token')
        const requests = [fetch(apiUrl('/api/problems'))]
        if (token) {
          requests.push(fetch(apiUrl('/api/users/me'), {
            headers: { Authorization: `Bearer ${token}` }
          }))
        }

        const [problemsRes, userRes] = await Promise.all(requests)
        const data = await problemsRes.json()
        setProblems(data)
        setFiltered(data)

        if (userRes?.ok) {
          const userData = await userRes.json()
          localStorage.setItem('user', JSON.stringify(userData))
          setSolvedProblemIds(getSolvedProblemIds(userData))
        }
      } catch {
        console.error('Failed to load problems')
      } finally {
        setLoading(false)
      }
    }

    fetchProblems()
  }, [])

  useEffect(() => {
    let result = problems

    if (difficulty !== 'All') {
      result = result.filter(p => p.difficulty === difficulty)
    }

    if (search) {
      result = result.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.topics.some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    }

    setFiltered(result)
  }, [difficulty, search, problems])

  if (loading) {
    return (
      <div className="practice-loading">
        <p>Fetching challenges...</p>
      </div>
    )
  }

  return (
    <div className="practice-page">
      <div className="practice-container">

        {/* HEADER */}
        <div className="practice-header">
          <h2>Practice</h2>

          <div className="controls">
            <input
              type="text"
              placeholder="Search problems or topics..."
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="practice-table-wrapper">
          <table className="practice-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>#</th>
                <th>Title</th>
                <th>Difficulty</th>
                <th>Topics</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((problem, index) => (
                <tr
                  key={problem._id}
                  className="practice-row"
                  onClick={() => navigate(`/problems/${problem._id}`)}
                >
                  <td>{index + 1}</td>

                  <td className="problem-title clickable">
                    <div className="problem-title-row">
                      <span>{problem.title}</span>
                      {solvedProblemIds.has(String(problem._id)) && (
                        <span className="practice-solved-badge">Solved</span>
                      )}
                    </div>
                  </td>

                  <td className={`diff ${problem.difficulty.toLowerCase()}`}>
                    {problem.difficulty}
                  </td>

                  <td className="topics">
                    {problem.topics.map(topic => (
                      <span key={topic} className="topic-tag">{topic}</span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="no-results">
            <p>No matches found for your search.</p>
          </div>
        )}

      </div>
    </div>
  )
}

export default PracticeProblems
