import { useEffect, useState } from 'react'
import './AdminDashboard.css' // Reusing dashboard styles for consistency
import { apiUrl } from '../../config/env'

const ArenaOversight = () => {
    const [battles, setBattles] = useState([])
    const [loading, setLoading] = useState(true)
    const token = localStorage.getItem('token')

    useEffect(() => {
        const fetchBattles = async () => {
            try {
                const res = await fetch(apiUrl('/api/admin/battles'), {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const data = await res.json()
                setBattles(data)
            } catch {
                console.error('Failed to load battles')
            } finally {
                setLoading(false)
            }
        }
        fetchBattles()
    }, [token])

    if (loading) return <div className="loading-screen">Scanning active streams...</div>

    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                <h2>Arena Oversight</h2>
                <p>Real-time monitoring of all competitive sessions across the platform.</p>
            </header>

            <div className="problems-table-wrapper" style={{ marginTop: '20px' }}>
                <table className="problems-table">
                    <thead>
                        <tr>
                            <th>Arena ID</th>
                            <th>Problem</th>
                            <th>Players</th>
                            <th>Status</th>
                            <th>Verdict</th>
                        </tr>
                    </thead>
                    <tbody>
                        {battles.map(b => (
                            <tr key={b._id}>
                                <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{b._id.slice(-8)}</td>
                                <td style={{ fontWeight: 600 }}>{b.problem?.title}</td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        {b.players.map(p => (
                                            <span key={p.user?._id} className="topic-tag" style={{ fontSize: '0.7rem' }}>
                                                {p.user?.username} ({p.progress}%)
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <span className={`role-badge ${b.status}`} style={{
                                        background: b.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                        color: b.status === 'active' ? '#10b981' : 'rgba(255, 255, 255, 0.5)'
                                    }}>
                                        {b.status}
                                    </span>
                                </td>
                                <td style={{ color: '#6366f1', fontWeight: 700 }}>
                                    {b.winner ? `Winner: ${b.players.find(p => p.user._id === b.winner)?.user?.username}` : 'No Winner'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default ArenaOversight
