import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { io } from 'socket.io-client'
import './BattleRoom.css'

const socket = io('http://localhost:5000')

const BattleRoom = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [battle, setBattle] = useState(null)
    const [code, setCode] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isRunning, setIsRunning] = useState(false)
    const [timer, setTimer] = useState(0)
    const [language, setLanguage] = useState('javascript')
    const [showReadyOverlay, setShowReadyOverlay] = useState(true)
    const [fullScreenExitCount, setFullScreenExitCount] = useState(0)
    const [runOutput, setRunOutput] = useState(null)
    const [activeCase, setActiveCase] = useState(0)

    const userId = JSON.parse(localStorage.getItem('user')).id

    // 1️⃣ INITIAL FETCH & SOCKET JOIN
    useEffect(() => {
        const fetchBattle = async () => {
            try {
                const token = localStorage.getItem('token')
                const res = await fetch(`http://localhost:5000/api/battles/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const data = await res.json()
                setBattle(data)

                const initialLang = 'javascript'
                if (data.problem?.starterCode && data.problem.starterCode[initialLang]) {
                    setCode(data.problem.starterCode[initialLang])
                }

                // Join Socket Room
                socket.emit('join_battle', id)
            } catch (err) {
                console.error('Failed to fetch battle', err)
            }
        }
        fetchBattle()
    }, [id])

    // 2️⃣ SOCKET LISTENERS
    useEffect(() => {
        socket.on('receive_progress', (data) => {
            setBattle(prev => {
                const newPlayers = [...prev.players]
                const pIndex = newPlayers.findIndex(p => p.user._id === data.userId)
                if (pIndex !== -1) {
                    newPlayers[pIndex].progress = data.progress
                    newPlayers[pIndex].code = data.code
                }
                return { ...prev, players: newPlayers }
            })
        })

        socket.on('battle_finished', (data) => {
            setBattle(prev => ({ ...prev, status: 'completed', winner: data.userId }))
        })

        return () => {
            socket.off('receive_progress')
            socket.off('battle_finished')
        }
    }, [])

    // 2.5️⃣ FULLSCREEN & PASTE BLOCKING
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && !showReadyOverlay && battle?.status === 'active') {
                setFullScreenExitCount(prev => prev + 1)
                alert("⚠️ WARNING: You exited Full Screen! Integrity is key in the Arena.")
            }
        }

        const blockPaste = (e) => {
            if (battle?.status === 'active') {
                e.preventDefault()
                alert("🚫 CLASH RULE: Copy-pasting code is strictly prohibited in the Arena!")
            }
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        window.addEventListener('paste', blockPaste)

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
            window.removeEventListener('paste', blockPaste)
        }
    }, [battle, showReadyOverlay])

    const handleEnterArena = () => {
        const elem = document.documentElement
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`)
            })
        }
        setShowReadyOverlay(false)
    }

    // 3️⃣ TIMER
    useEffect(() => {
        if (!battle || battle.status !== 'active') return
        const interval = setInterval(() => setTimer(prev => prev + 1), 1000)
        return () => clearInterval(interval)
    }, [battle])

    // 4️⃣ CODE SYNC (EMIT TO SOCKET)
    useEffect(() => {
        if (!battle || battle.status !== 'active') return

        const syncTimeout = setTimeout(() => {
            // Calculate progress (crude for now: lines shared vs total estimated)
            const progress = Math.min(Math.floor((code.length / 500) * 100), 95)
            socket.emit('send_progress', {
                battleId: id,
                userId: userId,
                progress,
                code
            })

            // Also update DB occasionally (non-blocking)
            const token = localStorage.getItem('token')
            fetch(`http://localhost:5000/api/battles/${id}/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ code, progress })
            })
        }, 1000)

        return () => clearTimeout(syncTimeout)
    }, [code, battle, id, userId])

    const handleRun = async () => {
        setIsRunning(true)
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
                    problemId: battle.problem._id,
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

    const handleSubmit = async () => {
        setIsSubmitting(true)
        const token = localStorage.getItem('token')
        try {
            const res = await fetch('http://localhost:5000/api/judge/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    problemId: battle.problem._id,
                    language,
                    code
                })
            })
            const data = await res.json()

            if (data.verdict === 'Accepted') {
                // Update DB (completes the battle status & handles scoring)
                await fetch(`http://localhost:5000/api/battles/${id}/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: 'solved', progress: 100 })
                })
                // Tell socket everyone is done
                socket.emit('battle_solved', { battleId: id, userId })
            } else {
                alert(`Submission Failed: ${data.verdict}`)
            }
        } catch (err) {
            console.error('Submission failed', err)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!battle) return <div className="loading-screen">Arena is preparing...</div>

    const me = battle.players.find(p => p.user?._id === userId)
    const competitor = battle.players.find(p => p.user?._id !== userId)

    return (
        <div className="battleroom-container">
            {/* READY OVERLAY (Required for Fullscreen gesture) */}
            {showReadyOverlay && (
                <div className="arena-ready-overlay">
                    <div className="ready-card">
                        <h1>PREPARE FOR BATTLE</h1>
                        <p>Entering the Arena will trigger Full-Screen mode. Copy-pasting is disabled to ensure a fair clash.</p>
                        <button className="enter-btn" onClick={handleEnterArena}>
                            I AM READY
                        </button>
                    </div>
                </div>
            )}

            {/* RESULTS MODAL */}
            {battle.status === 'completed' && (
                <div className="results-overlay">
                    <div className="results-card">
                        <div className="verdict-icon">
                            {battle.winner === userId ? '🏆' : '💀'}
                        </div>
                        <h2>{battle.winner === userId ? 'VICTORY' : 'DEFEAT'}</h2>
                        <p>
                            {battle.winner === userId
                                ? 'You coded like a legend! The arena is yours.'
                                : 'A valiant effort, but your opponent was faster this time.'}
                        </p>
                        <button className="home-btn" onClick={() => navigate('/dashboard')}>
                            BACK TO DASHBOARD
                        </button>
                    </div>
                </div>
            )}

            {/* TOP BAR */}
            <header className="battle-top-bar">
                <div className="battle-info">
                    <span className="battle-title">{battle.problem?.title}</span>
                    <span className={`difficulty-badge ${battle.difficulty.toLowerCase()}`}>
                        {battle.difficulty}
                    </span>
                </div>
                <div className="battle-timer">
                    {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                </div>
            </header>

            <main className="battle-main">
                <section className="battle-left-panel">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {battle.problem?.description}
                    </ReactMarkdown>
                </section>

                <section className="battle-right-panel">
                    <div className="progress-tracks">
                        <div className="player-track">
                            <span className="player-name">You ({me?.user?.username})</span>
                            <div className="track-bar-bg">
                                <div className="track-bar-fill" style={{ width: `${me?.progress || 0}%` }}></div>
                            </div>
                        </div>
                        {competitor && (
                            <div className="player-track">
                                <span className="player-name">Opponent ({competitor.user?.username})</span>
                                <div className="track-bar-bg">
                                    <div className="track-bar-fill competitor" style={{ width: `${competitor.progress || 0}%` }}></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="editor-container">
                        <div className="editor-header-mini" style={{ padding: '10px', background: '#252526', display: 'flex', justifyContent: 'flex-end' }}>
                            <select
                                value={me?.language || 'javascript'}
                                style={{ background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                                onChange={(e) => {
                                    const newLang = e.target.value
                                    // Normally we should sync this to DB, but for now just local UI
                                    if (battle.problem?.starterCode && battle.problem.starterCode[newLang]) {
                                        setCode(battle.problem.starterCode[newLang])
                                    }
                                }}
                            >
                                <option value="javascript">JavaScript</option>
                                <option value="python">Python</option>
                                <option value="java">Java</option>
                                <option value="cpp">C++</option>
                            </select>
                        </div>
                        <Editor
                            height="90%"
                            theme="vs-dark"
                            language={me?.language || 'javascript'}
                            value={code}
                            onChange={(val) => setCode(val)}
                            options={{ minimap: { enabled: false }, fontSize: 14 }}
                        />
                    </div>

                    <footer className="action-footer">
                        <button
                            className="battle-btn run"
                            onClick={handleRun}
                            disabled={isRunning || isSubmitting}
                        >
                            {isRunning ? 'Running...' : 'Run'}
                        </button>
                        <button
                            className="battle-btn submit"
                            onClick={handleSubmit}
                            disabled={isRunning || isSubmitting || battle.status === 'completed'}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Solution'}
                        </button>
                    </footer>

                    {/* CONSOLE FOR RUN RESULTS */}
                    {(runOutput || isRunning) && (
                        <div className="battle-console">
                            <div className="console-header">Run Results</div>
                            <div className="console-content">
                                {runOutput?.results ? (
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
                                ) : runOutput?.error ? (
                                    <div className="console-error">
                                        <strong>Error:</strong> {runOutput.error}
                                    </div>
                                ) : (
                                    <div className="placeholder-console">
                                        {isRunning ? 'Running code...' : 'No results yet.'}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    )
}

export default BattleRoom
