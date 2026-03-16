import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import socket from '../../socket/socketClient'
import './BattleRoom.css'
import { apiUrl } from '../../config/env'
const WAITING_POLL_INTERVAL_MS = 3000
const ACTIVE_POLL_INTERVAL_MS = 5000
const BATTLE_DURATIONS = {
    Easy: 15 * 60,
    Medium: 30 * 60,
    Hard: 45 * 60
}

const normalizeId = (value) => {
    if (!value) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'object' && value._id) return normalizeId(value._id)
    return String(value)
}

const getStoredUserId = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        return normalizeId(user.id || user._id)
    } catch {
        return ''
    }
}

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
    const [runOutput, setRunOutput] = useState(null)
    const [verdict, setVerdict] = useState(null)
    const [submitSummary, setSubmitSummary] = useState(null)
    const [activeCase, setActiveCase] = useState(0)
    const [completionReason, setCompletionReason] = useState(null)
    const pollRef = useRef(null)
    const hasEditedCodeRef = useRef(false)

    const userId = getStoredUserId()

    const applyStarterCode = useCallback((nextBattle) => {
        const starterCode = nextBattle?.problem?.starterCode?.[language]
        if (!starterCode || hasEditedCodeRef.current || code) return
        setCode(starterCode)
    }, [code, language])

    const fetchBattle = useCallback(async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(apiUrl(`/api/battles/${id}`), {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (!res.ok) {
                throw new Error(`Failed to fetch battle ${id}: ${res.status}`)
            }

            const data = await res.json()
            setBattle(data)
            setCompletionReason(data.resolutionReason || null)
            applyStarterCode(data)
            return data
        } catch (err) {
            console.error('Failed to fetch battle:', err)
            return null
        }
    }, [applyStarterCode, id])

    const stopPolling = useCallback(() => {
        clearInterval(pollRef.current)
        pollRef.current = null
    }, [])

    const startPolling = useCallback((intervalMs = WAITING_POLL_INTERVAL_MS) => {
        stopPolling()
        pollRef.current = setInterval(async () => {
            const data = await fetchBattle()
            if (data?.status === 'active' || data?.status === 'completed' || data?.status === 'cancelled') {
                if (intervalMs === WAITING_POLL_INTERVAL_MS && data.status === 'active') {
                    stopPolling()
                } else if (data.status === 'completed' || data.status === 'cancelled') {
                    stopPolling()
                }
            }
        }, intervalMs)
    }, [fetchBattle, stopPolling])

    useEffect(() => {
        const init = async () => {
            const data = await fetchBattle()
            if (!data) return

            socket.emit('join_battle', id)
            if (data.status === 'waiting') {
                startPolling(WAITING_POLL_INTERVAL_MS)
            } else if (data.status === 'active') {
                startPolling(ACTIVE_POLL_INTERVAL_MS)
            }
        }

        init()

        return () => {
            stopPolling()
            socket.emit('leave_battle', id)
        }
    }, [fetchBattle, id, startPolling, stopPolling])

    useEffect(() => {
        if (battle?.status === 'waiting') {
            startPolling(WAITING_POLL_INTERVAL_MS)
            return
        }

        if (battle?.status === 'active') {
            startPolling(ACTIVE_POLL_INTERVAL_MS)
            return
        }

        stopPolling()
    }, [battle?.status, startPolling, stopPolling])

    useEffect(() => {
        const handleMatchFound = (data) => {
            if (normalizeId(data?._id) !== id) return
            setBattle(data)
            setCompletionReason(data.resolutionReason || null)
            applyStarterCode(data)
            stopPolling()
        }

        const handleReceiveProgress = (data) => {
            if (normalizeId(data?.battleId) !== id) return

            setBattle(prev => {
                if (!prev) return prev

                const updatedPlayers = prev.players.map((player) => {
                    const playerId = normalizeId(player.user?._id || player.user)
                    if (playerId !== normalizeId(data.userId)) return player
                    return { ...player, progress: data.progress, code: data.code }
                })

                return { ...prev, players: updatedPlayers }
            })
        }

        const handleBattleFinished = (data) => {
            if (normalizeId(data?.battleId) !== id) return

            setBattle(prev => {
                if (!prev) return prev
                return { ...prev, status: 'completed', winner: data.userId || null }
            })
            setCompletionReason(data.reason || null)
            stopPolling()
        }

        socket.on('match_found', handleMatchFound)
        socket.on('receive_progress', handleReceiveProgress)
        socket.on('battle_finished', handleBattleFinished)

        return () => {
            socket.off('match_found', handleMatchFound)
            socket.off('receive_progress', handleReceiveProgress)
            socket.off('battle_finished', handleBattleFinished)
        }
    }, [applyStarterCode, id, stopPolling])

    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && !showReadyOverlay && battle?.status === 'active') {
                alert('WARNING: You exited Full Screen! Integrity is key in the Arena.')
            }
        }

        const blockPaste = (e) => {
            if (battle?.status === 'active') {
                e.preventDefault()
                alert('CLASH RULE: Copy-pasting code is strictly prohibited in the Arena!')
            }
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        window.addEventListener('paste', blockPaste)

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
            window.removeEventListener('paste', blockPaste)
        }
    }, [battle?.status, showReadyOverlay])

    const handleEnterArena = () => {
        const elem = document.documentElement
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.error(`Fullscreen error: ${err.message}`)
            })
        }
        setShowReadyOverlay(false)
    }

    useEffect(() => {
        if (battle?.status !== 'active') return

        if (typeof battle.remainingSeconds === 'number') {
            setTimer(Math.max(0, battle.remainingSeconds))
            return
        }

        const totalSeconds = BATTLE_DURATIONS[battle.difficulty] || BATTLE_DURATIONS.Medium
        const battleStart = battle.startTime ? new Date(battle.startTime).getTime() : Date.now()

        const updateTimer = () => {
            const elapsedSeconds = Math.max(0, Math.floor((Date.now() - battleStart) / 1000))
            setTimer(Math.max(0, totalSeconds - elapsedSeconds))
        }

        updateTimer()
        const interval = setInterval(updateTimer, 1000)

        return () => clearInterval(interval)
    }, [battle?.difficulty, battle?.remainingSeconds, battle?.startTime, battle?.status])

    useEffect(() => {
        if (battle?.status !== 'active') return

        const syncTimeout = setTimeout(() => {
            const progress = Math.min(Math.floor((code.length / 500) * 100), 95)
            socket.emit('send_progress', {
                battleId: id,
                userId,
                progress,
                code
            })

            const token = localStorage.getItem('token')
            fetch(apiUrl(`/api/battles/${id}/sync`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ code, progress })
            }).catch(err => console.error('Sync error:', err))
        }, 1000)

        return () => clearTimeout(syncTimeout)
    }, [battle?.status, code, id, userId])

    const handleRun = async () => {
        if (!battle?.problem?._id) return

        setIsRunning(true)
        setVerdict(null)
        setSubmitSummary(null)
        setRunOutput(null)
        const token = localStorage.getItem('token')

        try {
            if (!Array.isArray(battle.problem?.visibleTestCases) || battle.problem.visibleTestCases.length === 0) {
                setRunOutput({ error: 'No visible test cases are configured for this battle problem.' })
                return
            }

            const res = await fetch(apiUrl('/api/judge/run'), {
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

            if (!res.ok) {
                throw new Error(data.error || data.message || 'Failed to run code')
            }

            if (!Array.isArray(data.results) || data.results.length === 0) {
                setRunOutput({ error: 'No testcase results were returned by the judge.' })
                return
            }

            setRunOutput(data)
            setActiveCase(0)
        } catch (err) {
            console.error('Run failed:', err)
            setRunOutput({ error: err.message || 'Failed to run code' })
        } finally {
            setIsRunning(false)
        }
    }

    const handleSubmit = async () => {
        if (!battle?.problem?._id) return

        setIsSubmitting(true)
        setVerdict(null)
        setSubmitSummary(null)
        setRunOutput(null)
        const token = localStorage.getItem('token')

        try {
            const res = await fetch(apiUrl('/api/judge/submit'), {
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
            setVerdict(data.verdict || 'System Error')
            setSubmitSummary({
                passedCount: data.passedCount ?? 0,
                totalCount: data.totalCount ?? 0
            })

            if (data.verdict === 'Accepted') {
                await fetch(apiUrl(`/api/battles/${id}/sync`), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: 'solved', progress: 100 })
                })
                socket.emit('battle_solved', { battleId: id, userId })
            }
        } catch (err) {
            console.error('Submission failed:', err)
            setVerdict('System Error')
            setSubmitSummary(null)
            setRunOutput({ error: 'Submission failed. Check backend logs or configuration.' })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!battle) {
        return <div className="loading-screen">Arena is preparing...</div>
    }

    if (battle.status === 'waiting') {
        return (
            <div className="loading-screen waiting-screen">
                <div className="waiting-content">
                    <div className="waiting-icon">Waiting...</div>
                    <h2>Waiting for opponent...</h2>
                    <p>Stay on this page. The battle will activate automatically as soon as another player joins.</p>
                    <div className="radar-loader" style={{ margin: '20px auto' }}>
                        <div className="radar-pulse"></div>
                    </div>
                    <small style={{ color: '#888', marginTop: '10px' }}>Checking battle status every 3 seconds.</small>
                </div>
            </div>
        )
    }

    const me = battle.players.find(player => normalizeId(player.user?._id || player.user) === userId)
    const competitor = battle.players.find(player => normalizeId(player.user?._id || player.user) !== userId)
    const isWinner = normalizeId(battle.winner) === userId
    const isDraw = battle.status === 'completed' && !battle.winner
    const isTimeout = completionReason === 'timeout'

    return (
        <div className="battleroom-container">
            {showReadyOverlay && battle.status === 'active' && (
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

            {battle.status === 'completed' && (
                <div className="results-overlay">
                    <div className="results-card">
                        <div className="verdict-icon">
                            {isTimeout && isDraw ? 'TIME' : isDraw ? 'DRAW' : isWinner ? 'WIN' : 'LOSE'}
                        </div>
                        <h2>
                            {isTimeout && isDraw
                                ? 'TIMEOUT DRAW'
                                : isTimeout && isWinner
                                    ? 'TIMEOUT VICTORY'
                                    : isTimeout
                                        ? 'TIMEOUT DEFEAT'
                                        : isDraw
                                            ? 'DRAW'
                                            : isWinner
                                                ? 'VICTORY'
                                                : 'DEFEAT'}
                        </h2>
                        <p>
                            {isTimeout && isDraw
                                ? 'The clock hit zero and both sides were level enough to finish without a winner.'
                                : isTimeout && isWinner
                                    ? 'Time expired, and your progress lead secured the win.'
                                    : isTimeout
                                        ? 'Time expired before you could catch up.'
                                : isDraw
                                ? 'Time expired with no clear winner. The clash ends in a draw.'
                                : isWinner
                                ? 'You coded like a legend! The arena is yours.'
                                : 'A valiant effort, but your opponent was faster this time.'}
                        </p>
                        <button className="home-btn" onClick={() => navigate('/dashboard')}>
                            BACK TO DASHBOARD
                        </button>
                    </div>
                </div>
            )}

            <header className="battle-top-bar">
                <div className="battle-info">
                    <span className="battle-title">{battle.problem?.title}</span>
                    <span className={`difficulty-badge ${battle.difficulty?.toLowerCase()}`}>
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
                            <span className="player-name">You ({me?.user?.username || 'You'})</span>
                            <div className="track-bar-bg">
                                <div className="track-bar-fill" style={{ width: `${me?.progress || 0}%` }}></div>
                            </div>
                            <span className="progress-pct">{me?.progress || 0}%</span>
                        </div>

                        {competitor ? (
                            <div className="player-track">
                                <span className="player-name">{competitor.user?.username || 'Opponent'}</span>
                                <div className="track-bar-bg">
                                    <div className="track-bar-fill competitor" style={{ width: `${competitor.progress || 0}%` }}></div>
                                </div>
                                <span className="progress-pct">{competitor.progress || 0}%</span>
                            </div>
                        ) : (
                            <div className="player-track">
                                <span className="player-name" style={{ color: '#888' }}>Waiting for opponent...</span>
                                <div className="track-bar-bg">
                                    <div className="track-bar-fill competitor" style={{ width: '0%' }}></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="editor-container">
                        <div className="editor-header-mini" style={{ padding: '10px', background: '#252526', display: 'flex', justifyContent: 'flex-end' }}>
                            <select
                                value={language}
                                style={{ background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '4px 8px' }}
                                onChange={(e) => {
                                    const nextLanguage = e.target.value
                                    setLanguage(nextLanguage)
                                    hasEditedCodeRef.current = false
                                    if (battle.problem?.starterCode?.[nextLanguage]) {
                                        setCode(battle.problem.starterCode[nextLanguage])
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
                            language={language}
                            value={code}
                            onChange={(value) => {
                                hasEditedCodeRef.current = true
                                setCode(value || '')
                            }}
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

                    {(runOutput || isRunning || verdict || submitSummary) && (
                        <div className="battle-console">
                            <div className="console-header">Run Results</div>
                            <div className="console-content">
                                {verdict && (
                                    <div className={`verdict-display ${verdict === 'Accepted' ? 'success' : 'error'}`}>
                                        {verdict}
                                    </div>
                                )}

                                {submitSummary && (
                                    <div className="placeholder-console">
                                        {submitSummary.passedCount}/{submitSummary.totalCount} test cases passed.
                                    </div>
                                )}

                                {runOutput?.results ? (
                                    <div className="test-results">
                                        <div className="case-tabs">
                                            {runOutput.results.map((result, index) => (
                                                <button
                                                    key={index}
                                                    className={`case-tab ${activeCase === index ? 'active' : ''} ${result.passed ? 'pass' : 'fail'}`}
                                                    onClick={() => setActiveCase(index)}
                                                >
                                                    Case {index + 1}
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
                                ) : !verdict ? (
                                    <div className="placeholder-console">
                                        {isRunning ? 'Running code...' : 'No results yet.'}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    )
}

export default BattleRoom
