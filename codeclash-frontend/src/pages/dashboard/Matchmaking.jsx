import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import socket from '../../socket/socketClient'
import './Matchmaking.css'
import { apiUrl } from '../../config/env'
const POLL_INTERVAL_MS = 2000

const normalizeId = (value) => {
    if (!value) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'object' && value._id) return normalizeId(value._id)
    return String(value)
}

const Matchmaking = () => {
    const navigate = useNavigate()
    const [difficulty, setDifficulty] = useState('Medium')
    const [isSearching, setIsSearching] = useState(false)
    const [timer, setTimer] = useState(0)
    const battleIdRef = useRef(null)
    const pollRef = useRef(null)
    const timerRef = useRef(null)
    const isSearchingRef = useRef(false)

    const stopSearching = useCallback(() => {
        isSearchingRef.current = false
        setIsSearching(false)
        clearInterval(pollRef.current)
        clearInterval(timerRef.current)
        pollRef.current = null
        timerRef.current = null
    }, [])

    const leaveCurrentBattleRoom = useCallback(() => {
        if (!battleIdRef.current) return
        socket.emit('leave_battle', battleIdRef.current)
        battleIdRef.current = null
    }, [])

    const cancelServerMatchmaking = useCallback(async () => {
        const token = localStorage.getItem('token')
        try {
            await fetch(apiUrl('/api/battles/cancel'), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            })
        } catch (err) {
            console.error('Cancel matchmaking failed:', err)
        }
    }, [])

    const fetchBattleStatus = useCallback(async (battleId) => {
        const token = localStorage.getItem('token')
        const res = await fetch(apiUrl(`/api/battles/${battleId}`), {
            headers: { Authorization: `Bearer ${token}` }
        })

        if (!res.ok) {
            throw new Error(`Failed to fetch battle ${battleId}: ${res.status}`)
        }

        return res.json()
    }, [])

    const startPolling = useCallback((battleId) => {
        clearInterval(pollRef.current)
        pollRef.current = setInterval(async () => {
            try {
                const data = await fetchBattleStatus(battleId)
                if (battleIdRef.current !== battleId) return

                if (data.status === 'active') {
                    stopSearching()
                    leaveCurrentBattleRoom()
                    navigate(`/battle/${battleId}`)
                } else if (data.status === 'cancelled' || data.status === 'completed') {
                    stopSearching()
                    leaveCurrentBattleRoom()
                }
            } catch (err) {
                console.error('Poll error:', err)
            }
        }, POLL_INTERVAL_MS)
    }, [fetchBattleStatus, leaveCurrentBattleRoom, navigate, stopSearching])

    useEffect(() => {
        return () => {
            stopSearching()
            leaveCurrentBattleRoom()
        }
    }, [leaveCurrentBattleRoom, stopSearching])

    useEffect(() => {
        if (isSearching) {
            setTimer(0)
            timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000)
        } else {
            clearInterval(timerRef.current)
        }

        return () => clearInterval(timerRef.current)
    }, [isSearching])

    useEffect(() => {
        const handleMatchFound = (data) => {
            const eventBattleId = normalizeId(data?._id)
            if (!isSearchingRef.current || !eventBattleId || battleIdRef.current !== eventBattleId) {
                return
            }

            stopSearching()
            leaveCurrentBattleRoom()
            navigate(`/battle/${eventBattleId}`)
        }

        socket.on('match_found', handleMatchFound)
        return () => socket.off('match_found', handleMatchFound)
    }, [leaveCurrentBattleRoom, navigate, stopSearching])

    const startMatchmaking = async () => {
        leaveCurrentBattleRoom()
        stopSearching()
        isSearchingRef.current = true
        setIsSearching(true)

        const token = localStorage.getItem('token')

        try {
            const res = await fetch(apiUrl('/api/battles/match'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ difficulty })
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.message || 'Matchmaking failed')
            }

            if (data.status === 'active') {
                stopSearching()
                navigate(`/battle/${data._id}`)
                return
            }

            const waitingBattleId = normalizeId(data._id)
            battleIdRef.current = waitingBattleId
            socket.emit('join_battle', waitingBattleId)
            startPolling(waitingBattleId)
        } catch (err) {
            console.error('Matchmaking request failed:', err)
            leaveCurrentBattleRoom()
            stopSearching()
        }
    }

    const cancelMatchmaking = async () => {
        stopSearching()
        leaveCurrentBattleRoom()
        await cancelServerMatchmaking()
    }

    return (
        <div className="matchmaking-container">
            {!isSearching ? (
                <>
                    <h1 className="matchmaking-title">Code Clash</h1>
                    <p className="matchmaking-subtitle">Ready to prove your skills? Enter the arena and duel with other developers.</p>

                    <div className="difficulty-selection">
                        {['Easy', 'Medium', 'Hard'].map((diff) => (
                            <div
                                key={diff}
                                className={`difficulty-card ${diff.toLowerCase()} ${difficulty === diff ? 'selected' : ''}`}
                                onClick={() => setDifficulty(diff)}
                            >
                                <h3>{diff}</h3>
                                <p>{diff === 'Easy' ? 'Fast-paced fun' : diff === 'Medium' ? 'Balanced challenge' : 'True mastery test'}</p>
                            </div>
                        ))}
                    </div>

                    <button className="match-btn" onClick={startMatchmaking}>
                        FIND MATCH
                    </button>
                </>
            ) : (
                <div className="waiting-container">
                    <h1 className="matchmaking-title">Searching...</h1>
                    <p className="matchmaking-subtitle">Searching for a worthy opponent for <strong>{difficulty}</strong> challenge.</p>

                    <div className="radar-loader">
                        <div className="radar-pulse"></div>
                    </div>

                    <div className="timer">
                        {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                    </div>

                    <button className="cancel-btn" onClick={cancelMatchmaking}>
                        CANCEL SEARCH
                    </button>
                </div>
            )}
        </div>
    )
}

export default Matchmaking
