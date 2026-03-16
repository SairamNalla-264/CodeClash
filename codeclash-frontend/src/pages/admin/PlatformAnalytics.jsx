import { useEffect, useState } from 'react'
import './AdminDashboard.css'
import { apiUrl } from '../../config/env'

const emptyStats = {
    users: 0,
    problems: 0,
    battles: 0,
    submissions: 0,
    acceptedSubmissions: 0,
    activeBattles: 0,
    completedBattles: 0,
    usersLast24Hours: 0,
    submissionsLast24Hours: 0,
    battlesLast24Hours: 0,
    successRate: 0,
    engagementRate: 0,
    growth: []
}

const PlatformAnalytics = () => {
    const [stats, setStats] = useState(emptyStats)
    const token = localStorage.getItem('token')

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(apiUrl('/api/admin/stats'), {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const data = await res.json()
                setStats({ ...emptyStats, ...data })
            } catch {
                console.error('Failed to load stats')
            }
        }

        fetchStats()
    }, [token])

    const growthMax = Math.max(
        1,
        ...stats.growth.flatMap((item) => [item.users, item.submissions, item.battles])
    )

    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                <h2>Tactical Analytics</h2>
                <p>Vitals and growth metrics for the CodeClash ecosystem.</p>
            </header>

            <div className="admin-stats">
                <div className="admin-card">
                    <h3>New Users</h3>
                    <span>{stats.usersLast24Hours}</span>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>
                        Registered in the last 24 hours
                    </p>
                </div>
                <div className="admin-card" style={{ borderColor: '#10b981' }}>
                    <h3>Success Rate</h3>
                    <span>{stats.successRate}%</span>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>
                        {stats.acceptedSubmissions} accepted out of {stats.submissions} submissions
                    </p>
                </div>
                <div className="admin-card" style={{ borderColor: '#6366f1' }}>
                    <h3>Live Battles</h3>
                    <span>{stats.activeBattles}</span>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>
                        {stats.completedBattles} completed battles overall
                    </p>
                </div>
            </div>

            <div className="activity-card" style={{ marginTop: '40px' }}>
                <h3>Platform Growth</h3>
                <div style={{ display: 'flex', gap: '20px', marginTop: '10px', color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                    <span>{stats.users} total users</span>
                    <span>{stats.problems} total problems</span>
                    <span>{stats.battles} total battles</span>
                    <span>{stats.submissionsLast24Hours} submissions in 24h</span>
                    <span>{stats.battlesLast24Hours} battles created in 24h</span>
                    <span>{stats.engagementRate}% completed-battle to user ratio</span>
                </div>

                <div style={{ padding: '20px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', height: '220px' }}>
                        {stats.growth.map((item) => (
                            <div key={item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '180px', width: '100%' }}>
                                    <div
                                        title={`${item.label}: ${item.users} users`}
                                        style={{
                                            flex: 1,
                                            height: `${Math.max(8, Math.round((item.users / growthMax) * 100))}%`,
                                            background: 'linear-gradient(to top, #22c55e, #86efac)',
                                            borderRadius: '8px 8px 0 0'
                                        }}
                                    ></div>
                                    <div
                                        title={`${item.label}: ${item.submissions} submissions`}
                                        style={{
                                            flex: 1,
                                            height: `${Math.max(8, Math.round((item.submissions / growthMax) * 100))}%`,
                                            background: 'linear-gradient(to top, #6366f1, #a855f7)',
                                            borderRadius: '8px 8px 0 0'
                                        }}
                                    ></div>
                                    <div
                                        title={`${item.label}: ${item.battles} battles`}
                                        style={{
                                            flex: 1,
                                            height: `${Math.max(8, Math.round((item.battles / growthMax) * 100))}%`,
                                            background: 'linear-gradient(to top, #f59e0b, #fcd34d)',
                                            borderRadius: '8px 8px 0 0'
                                        }}
                                    ></div>
                                </div>
                                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>{item.label}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '18px', marginTop: '14px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                        <span>Green: Users</span>
                        <span>Purple: Submissions</span>
                        <span>Gold: Battles</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PlatformAnalytics
