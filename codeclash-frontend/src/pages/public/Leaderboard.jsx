import { useEffect, useState } from 'react'
import './Leaderboard.css'

const Leaderboard = () => {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/users/leaderboard')
                const data = await res.json()
                setUsers(data)
            } catch (err) {
                console.error('Failed to fetch leaderboard', err)
            } finally {
                setLoading(false)
            }
        }

        fetchLeaderboard()
    }, [])

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading legends...</p>
            </div>
        )
    }

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-header">
                <h1>Global Leaderboard</h1>
                <p>Ranking the best of CodeClash based on problems solved.</p>
            </div>

            <div className="leaderboard-table-wrapper">
                {users.length === 0 ? (
                    <div className="no-data">⚔️ Lead the way and be the first on the board!</div>
                ) : (
                    <table className="leaderboard-table">
                        <thead>
                            <tr>
                                <th className="rank-cell">Rank</th>
                                <th>User</th>
                                <th>Solved</th>
                                <th>ELO</th>
                                <th>Streak</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user, index) => (
                                <tr key={user._id || index} className="leaderboard-row">
                                    <td className={`rank-cell rank-${index + 1}`}>
                                        {index + 1 === 1 ? '🥇' : index + 1 === 2 ? '🥈' : index + 1 === 3 ? '🥉' : index + 1}
                                    </td>
                                    <td>
                                        <div className="user-cell">
                                            <div className="avatar-mock">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="username">{user.username}</span>
                                        </div>
                                    </td>
                                    <td className="solved-cell">{user.solved || 0}</td>
                                    <td className="elo-cell">{user.elo || 1200}</td>
                                    <td className="streak-cell">
                                        <span className="streak-icon">🔥</span>
                                        {user.streak || 0}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}

export default Leaderboard
