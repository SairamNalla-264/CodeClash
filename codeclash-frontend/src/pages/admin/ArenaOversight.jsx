import { useEffect, useState } from 'react'
import './AdminDashboard.css' // Reusing dashboard styles for consistency
import { apiUrl } from '../../config/env'

const normalizeId = (value) => {
    if (!value) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'object' && value._id) return normalizeId(value._id)
    return String(value)
}

const ArenaOversight = () => {
    const [battles, setBattles] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const token = localStorage.getItem('token')

    useEffect(() => {
        const fetchBattles = async () => {
            try {
                const res = await fetch(apiUrl('/api/admin/battles'), {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (!res.ok) {
                    throw new Error(`Failed to fetch battles: ${res.status}`)
                }
                const data = await res.json()
                setBattles(Array.isArray(data) ? data : [])
                setError('')
            } catch (err) {
                console.error('Failed to load battles', err)
                setError('Failed to load battles.')
                setBattles([])
            } finally {
                setLoading(false)
            }
        }
        fetchBattles()
    }, [token])

    if (loading) return <div className="loading-screen">Scanning active streams...</div>
    if (error) return <div className="loading-screen">{error}</div>

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
                        {battles.map(b => {
                            const players = Array.isArray(b.players) ? b.players : []
                            const winner = players.find(p => normalizeId(p.user) === normalizeId(b.winner))

                            return (
                            <tr key={b._id}>
                                <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{String(b._id || '').slice(-8)}</td>
                                <td style={{ fontWeight: 600 }}>{b.problem?.title || 'Unknown problem'}</td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        {players.length === 0 ? (
                                            <span className="topic-tag" style={{ fontSize: '0.7rem' }}>
                                                No players
                                            </span>
                                        ) : players.map((p, index) => (
                                            <span key={normalizeId(p.user) || index} className="topic-tag" style={{ fontSize: '0.7rem' }}>
                                                {p.user?.username || 'Unknown user'} ({p.progress ?? 0}%)
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
                                    {b.winner ? `Winner: ${winner?.user?.username || 'Unknown user'}` : 'No Winner'}
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default ArenaOversight
