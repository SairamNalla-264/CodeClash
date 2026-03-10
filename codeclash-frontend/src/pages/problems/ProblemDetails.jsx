import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './ProblemDetails.css'

const ProblemDetails = () => {
  const { id } = useParams()

  const user = JSON.parse(localStorage.getItem('user')) || {}
  const solvedProblems = (user.solvedProblems || []).map(String)

  const [problem, setProblem] = useState(null)
  const [activeTab, setActiveTab] = useState('description')

  const [language, setLanguage] = useState('javascript')
  const [code, setCode] = useState('')

  // RUN
  const [runOutput, setRunOutput] = useState(null)
  const [activeCase, setActiveCase] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  // SUBMIT
  const [verdict, setVerdict] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // SUBMISSIONS TAB
  const [submissions, setSubmissions] = useState([])
  const [peerRecs, setPeerRecs] = useState([])

  const isSolved = solvedProblems.includes(id)

  /* ================= FETCH PROBLEM ================= */
  useEffect(() => {
    const cached = sessionStorage.getItem(`problem-${id}`)
    if (cached) {
      setProblem(JSON.parse(cached))
      return
    }

    const fetchProblem = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/problems/${id}`)
        const data = await res.json()
        setProblem(data)

        const initialLang = 'javascript'
        if (data.starterCode && data.starterCode[initialLang]) {
          setCode(data.starterCode[initialLang])
        } else if (data.starterCode) {
          // Fallback to first available language if JS not present
          const firstLang = Object.keys(data.starterCode)[0]
          if (firstLang) {
            setLanguage(firstLang)
            setCode(data.starterCode[firstLang])
          }
        }
        sessionStorage.setItem(`problem-${id}`, JSON.stringify(data))
      } catch (err) {
        console.error('Failed to fetch problem', err)
      }
    }

    fetchProblem()
  }, [id])

  /* ================= FETCH SUBMISSIONS ================= */
  useEffect(() => {
    if (activeTab !== 'submissions') return

    const fetchSubmissions = async () => {
      const token = localStorage.getItem('token')
      try {
        const res = await fetch(
          `http://localhost:5000/api/submissions/problem/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const data = await res.json()
        setSubmissions(data)
      } catch (err) {
        console.error('Failed to fetch submissions', err)
      }
    }

    fetchSubmissions()
  }, [activeTab, id])

  /* ================= FETCH PEER RECS ================= */
  useEffect(() => {
    const fetchPeerRecs = async () => {
      const token = localStorage.getItem('token')
      try {
        const res = await fetch('http://localhost:5000/api/users/recommendations/collaborative', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        setPeerRecs(data)
      } catch (err) {
        console.error('Failed to fetch peer recommendations', err)
      }
    }
    fetchPeerRecs()
  }, [])

  /* ================= RUN ================= */
  const handleRun = async () => {
    setIsRunning(true)
    setVerdict(null)
    setRunOutput(null)

    const token = localStorage.getItem('token')
    try {
      const res = await fetch('http://localhost:5000/api/judge/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          problemId: problem._id,
          language,
          code
        })
      })

      const data = await res.json()
      setRunOutput(data)
      setActiveCase(0)
    } catch (err) {
      console.error('Run failed', err)
      setRunOutput({ error: 'Failed to run code' })
    } finally {
      setIsRunning(false)
    }
  }

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
    setIsSubmitting(true)
    setVerdict(null)
    setRunOutput(null)

    const token = localStorage.getItem('token')
    try {
      const res = await fetch('http://localhost:5000/api/judge/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          problemId: problem._id,
          language,
          code
        })
      })

      const data = await res.json()
      setVerdict(data.verdict)

      if (data.verdict === 'Accepted' && !isSolved) {
        const updatedUser = {
          ...user,
          solvedProblems: [...(user.solvedProblems || []), problem._id]
        }
        localStorage.setItem('user', JSON.stringify(updatedUser))
      }
    } catch (err) {
      setVerdict('System Error')
      setRunOutput({ error: 'Submission failed. Check backend logs or configuration.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ================= LOADING ================= */
  if (!problem) {
    return <div className="loading-screen">Loading Problem...</div>
  }

  return (
    <div className="problem-workspace">

      {/* LEFT PANEL: Description & Tabs */}
      <div className="left-panel">
        <div className="workspace-tabs">
          {['description', 'submissions'].map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="panel-content">
          {activeTab === 'description' && (
            <div className="description-container">
              <div className="problem-header">
                <h2>{problem.title}</h2>
                <div className="problem-meta">
                  <span className={`difficulty ${problem.difficulty.toLowerCase()}`}>
                    {problem.difficulty}
                  </span>
                  {isSolved && <span className="solved-badge">Solved</span>}
                </div>
              </div>

              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {problem.description}
                </ReactMarkdown>
              </div>

              <div className="examples-section">
                {problem.examples.map((ex, i) => (
                  <div key={i} className="prob-example">
                    <strong>Example {i + 1}:</strong>
                    <div className="example-block">
                      <p><span className="label">Input:</span> {ex.input}</p>
                      <p><span className="label">Output:</span> {ex.output}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="constraints-section">
                <strong>Constraints:</strong>
                <ul>
                  {problem.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              {/* Peer Recommendations */}
              {peerRecs.length > 0 && (
                <div className="peer-recommendations">
                  <h3>Recommended Next</h3>
                  <div className="peer-rec-list">
                    {peerRecs.slice(0, 3).map(p => (
                      <div key={p._id} className="peer-rec-card" onClick={() => window.location.href = `/problems/${p._id}`}>
                        <div className="p-rec-title">{p.title}</div>
                        <div className={`p-rec-diff ${p.difficulty.toLowerCase()}`}>{p.difficulty}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'submissions' && (
            <div className="submissions-list">
              {submissions.length === 0 ? (
                <div className="no-data">No submissions yet</div>
              ) : (
                <table className="subs-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Runtime</th>
                      <th>Language</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(s => (
                      <tr key={s._id}>
                        <td>{new Date(s.createdAt).toLocaleString()}</td>
                        <td className={`status-${s.verdict.toLowerCase().replace(' ', '-')}`}>
                          {s.verdict}
                        </td>
                        <td>{s.runtime} ms</td>
                        <td>{s.language}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Editor & Console */}
      <div className="right-panel">
        <div className="editor-top-bar">
          <div className="lang-select">
            <select
              value={language}
              onChange={e => {
                const newLang = e.target.value
                setLanguage(newLang)
                // Swap starter code if user hasn't typed much or if they want to reset
                if (problem.starterCode && problem.starterCode[newLang]) {
                  setCode(problem.starterCode[newLang])
                }
              }}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
          </div>
          <div className="action-buttons">
            <button
              className="btn btn-run"
              onClick={handleRun}
              disabled={isRunning || isSubmitting}
            >
              {isRunning ? 'Running...' : 'Run'}
            </button>
            <button
              className="btn btn-submit"
              onClick={handleSubmit}
              disabled={isRunning || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>

        <div className="editor-wrapper">
          <Editor
            height="100%"
            theme="vs-dark"
            language={language === 'nodejs' ? 'javascript' : language}
            value={code}
            onChange={(value) => setCode(value)}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              automaticLayout: true
            }}
          />
        </div>

        {/* BOTTOM CONSOLE */}
        <div className="console-panel">
          <div className="console-header">Run Results / Verdict</div>
          <div className="console-content">
            {verdict && (
              <div className={`verdict-display ${verdict === 'Accepted' ? 'success' : 'error'}`}>
                {verdict}
              </div>
            )}

            {runOutput?.results && runOutput.results.length > 0 && (
              <div className="test-results">
                <div className="case-tabs">
                  {runOutput.results.map((r, i) => (
                    <button
                      key={i}
                      className={`case-tab ${activeCase === i ? 'active' : ''} ${r.passed ? 'pass' : 'fail'}`}
                      onClick={() => setActiveCase(i)}
                    >
                      Case {i + 1}
                    </button>
                  ))}
                </div>
                <div className="case-details">
                  <div className="detail-row">
                    <span className="label">Input:</span>
                    <pre>{runOutput.results[activeCase].input}</pre>
                  </div>
                  <div className="detail-row">
                    <span className="label">Output:</span>
                    <pre>{runOutput.results[activeCase].output}</pre>
                  </div>
                  <div className="detail-row">
                    <span className="label">Expected:</span>
                    <pre>{runOutput.results[activeCase].expected}</pre>
                  </div>
                </div>
              </div>
            )}

            {runOutput?.error && !runOutput?.results && (
              <div className="console-error">
                <strong>Error:</strong> {runOutput.error}
              </div>
            )}

            {!verdict && !runOutput && (
              <div className="placeholder-console">
                Run your code to see results here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProblemDetails
