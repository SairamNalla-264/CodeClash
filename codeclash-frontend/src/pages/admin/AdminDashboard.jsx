import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminDashboard.css'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [admin, setAdmin] = useState(null)
  const [stats, setStats] = useState({ users: 142, problems: 24, battles: 18 })

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'))
    const token = localStorage.getItem('token')

    if (!storedUser || storedUser.role !== 'admin') {
      navigate('/dashboard')
      return
    }

    setAdmin(storedUser)

    const fetchStats = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        setStats(data)
      } catch (err) {
        console.error('Failed to fetch admin stats')
      }
    }
    fetchStats()
  }, [navigate])

  if (!admin) return <div className="loading-screen">Authenticating Admin Access...</div>

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h2>Command Center</h2>
        <p>Orchestrate the CodeClash experience and monitor platform vitals.</p>
      </header>

      <section className="admin-stats">
        <div className="admin-card">
          <h3>Fleet Strength</h3>
          <span>{stats.users}</span>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>Registered Users</p>
        </div>

        <div className="admin-card">
          <h3>The Vault</h3>
          <span>{stats.problems}</span>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>Total Problems</p>
        </div>

        <div className="admin-card">
          <h3>Active Fire</h3>
          <span>{stats.battles}</span>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>Ongoing Battles</p>
        </div>
      </section>

      <section className="admin-actions">
        <div className="admin-action-card" onClick={() => navigate('/admin/users')}>
          👥 Citizen Registry
        </div>
        <div className="admin-action-card" onClick={() => navigate('/admin/problems')}>
          🧠 Challenge Forge
        </div>
        <div className="admin-action-card" onClick={() => navigate('/admin/battles')}>
          ⚔️ Arena Oversight
        </div>
        <div className="admin-action-card" onClick={() => navigate('/admin/analytics')}>
          📊 Tactical Analytics
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
