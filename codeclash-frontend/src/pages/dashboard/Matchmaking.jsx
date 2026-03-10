import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import './Matchmaking.css'

const socket = io('http://localhost:5000')

const Matchmaking = () => {
    const navigate = useNavigate()
    const [difficulty, setDifficulty] = useState('Medium')
    const [isSearching, setIsSearching] = useState(false)
    const [timer, setTimer] = useState(0)
    const [battleId, setBattleId] = useState(null)

    useEffect(() => {
        let interval
        if (isSearching) {
            interval = setInterval(() => {
                setTimer(prev => prev + 1)
            }, 1000)
        } else {
            setTimer(0)
        }
        return () => clearInterval(interval)
    }, [isSearching])

    // SOCKET LISTENERS
    useEffect(() => {
        socket.on('match_found', (data) => {
            console.log('Match Found!', data)
            setIsSearching(false)
            navigate(`/battle/${data._id}`)
        })

        return () => {
            socket.off('match_found')
        }
    }, [navigate])

    const startMatchmaking = async () => {
        setIsSearching(true)
        const token = localStorage.getItem('token')
        try {
            const res = await fetch('http://localhost:5000/api/battles/match', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ difficulty })
            })
            const data = await res.json()

            if (data.status === 'active') {
                navigate(`/battle/${data._id}`)
            } else {
                setBattleId(data._id)
                // Join the socket room for this battle to wait for notification
                socket.emit('join_battle', data._id)
            }
        } catch (err) {
            console.error('Matchmaking request failed', err)
            setIsSearching(false)
        }
    }

    const cancelMatchmaking = () => {
        setIsSearching(false)
        setBattleId(null)
        if (battleId) {
            socket.emit('leave_battle', battleId);
        }
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
