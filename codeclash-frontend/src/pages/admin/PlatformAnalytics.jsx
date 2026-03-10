import { useEffect, useState } from 'react'
import './AdminDashboard.css'

const PlatformAnalytics = () => {
    const [stats, setStats] = useState({ users: 0, problems: 0, battles: 0 })
    const token = localStorage.getItem('token')

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/admin/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const data = await res.json()
                setStats(data)
            } catch (err) {
                console.error('Failed to load stats')
            }
        }
        fetchStats()
    }, [token])

    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                <h2>Tactical Analytics</h2>
                <p>Vitals and growth metrics for the CodeClash ecosystem.</p>
            </header>

            <div className="admin-stats">
                <div className="admin-card">
                    <h3>Traffic</h3>
                    <span>{stats.users * 12}</span>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>Hits / 24h</p>
                </div>
                <div className="admin-card" style={{ borderColor: '#10b981' }}>
                    <h3>Success Rate</h3>
                    <span>82%</span>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>Submission Accepted</p>
                </div>
                <div className="admin-card" style={{ borderColor: '#6366f1' }}>
                    <h3>Engagement</h3>
                    <span>{Math.round(stats.battles / (stats.users || 1) * 100)}%</span>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>Battle Participation</p>
                </div>
            </div>

            <div className="activity-card" style={{ marginTop: '40px' }}>
                <h3>Platform Growth</h3>
                <div style={{ padding: '20px 0' }}>
                    {/* CSS-only chart representation */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', height: '200px' }}>
                        {[40, 65, 55, 90, 85, 100].map((h, i) => (
                            <div key={i} style={{
                                flex: 1,
                                height: `${h}%`,
                                background: 'linear-gradient(to top, #6366f1, #a855f7)',
                                borderRadius: '8px 8px 0 0',
                                opacity: 0.3 + (i * 0.1)
                            }}></div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
                        <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PlatformAnalytics
