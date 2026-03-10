import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import './DashboardHome.css'

const DashboardHome = () => {
  const navigate = useNavigate()

  // ✅ INSTANT LOAD FROM LOCAL STORAGE
  const cachedUser = JSON.parse(localStorage.getItem('user'))
  const [user, setUser] = useState(cachedUser)
  const [daily, setDaily] = useState(null)
  const [recs, setRecs] = useState([])
  const [collabRecs, setCollabRecs] = useState([])

  // 🔄 BACKGROUND REFRESH (NON-BLOCKING)
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        const res = await fetch('http://localhost:5000/api/users/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const freshUser = await res.json()

        // Update UI + cache silently
        setUser(freshUser)
        localStorage.setItem('user', JSON.stringify(freshUser))

        // Fetch Daily
        const dailyRes = await fetch('http://localhost:5000/api/problems/daily')
        const dailyData = await dailyRes.json()
        setDaily(dailyData)

        // Fetch Recommendations (Content-Based)
        const recsRes = await fetch('http://localhost:5000/api/problems/recommendations', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const recsData = await recsRes.json()
        setRecs(recsData)

        // Fetch Collaborative Recommendations
        const collabRes = await fetch('http://localhost:5000/api/users/recommendations/collaborative', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const collabData = await collabRes.json()
        setCollabRecs(collabData)
      } catch {
        // If API fails, keep cached data
        console.log('Syncing data failed')
      }
    }

    fetchData()
  }, [])

  // ❌ NO BLOCKING LOADER ANYMORE
  if (!user) {
    return (
      <p style={{ color: 'white', padding: '2rem' }}>
        Preparing dashboard...
      </p>
    )
  }

  return (
    <div className="dashboard">

      {/* Header */}
      <div className="dashboard-header">
        <h2>Welcome back, {user.username} 👋</h2>
        <p>Your coding journey continues. Ready to climb the leaderboard?</p>
      </div>

      {/* Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Current ELO</h3>
          <div className="stat-value stat-highlight">{user.elo}</div>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>Top 5% of users</p>
        </div>

        <div className="stat-card">
          <h3>Streak</h3>
          <div className="stat-value">{user.streak || 0} 🔥</div>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>Keep it going!</p>
        </div>

        <div className="stat-card">
          <h3>Solved</h3>
          <div className="stat-value">{user.solved || 0}</div>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>Problems completed</p>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="dashboard-actions">
        <div className="action-card" onClick={() => navigate('/matchmaking')}>
          <div className="action-tag">RECOMMENDED</div>
          <h3>⚔️ 1v1 Arena</h3>
          <p>Face an opponent matched by your Elo rating in a real-time battle.</p>
        </div>

        <div className="action-card" style={{ background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))', border: '1px solid rgba(16, 185, 129, 0.2)' }} onClick={() => navigate('/practice')}>
          <h3>📓 Daily Challenge</h3>
          <p>Solve today's featured problem to boost your streak and ELO.</p>
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="recommendations-container">
        <div className="rec-section">
          <div className="section-title">
            <h3>Recommended for You</h3>
            <span className="badge">Topic Based</span>
          </div>
          <div className="rec-list">
            {recs.map(prob => (
              <div key={prob._id} className="rec-item" onClick={() => navigate(`/practice`)}>
                <div className="rec-info">
                  <span className="rec-title">{prob.title}</span>
                  <span className={`difficulty-tag ${prob.difficulty.toLowerCase()}`}>{prob.difficulty}</span>
                </div>
                <div className="rec-topics">
                  {prob.topics.slice(0, 2).map(t => <span key={t} className="topic-pill">{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rec-section">
          <div className="section-title">
            <h3>Users Like You Solved</h3>
            <span className="badge gold">Collaborative</span>
          </div>
          <div className="rec-list">
            {collabRecs.map(prob => (
              <div key={prob._id} className="rec-item" onClick={() => navigate(`/practice`)}>
                <div className="rec-info">
                  <span className="rec-title">{prob.title}</span>
                  <span className={`difficulty-tag ${prob.difficulty.toLowerCase()}`}>{prob.difficulty}</span>
                </div>
                <div className="rec-topics">
                  {prob.topics.slice(0, 2).map(t => <span key={t} className="topic-pill">{t}</span>)}
                </div>
              </div>
            ))}
            {collabRecs.length === 0 && <p className="no-data">Solve more problems to get peer recommendations!</p>}
          </div>
        </div>
      </div>

      {/* Secondary Links */}
      <div className="dashboard-links">
        <div className="link-card" onClick={() => navigate('/practice')}>
          <span>🧠</span>
          <p>Practice</p>
        </div>

        <div className="link-card" onClick={() => navigate('/leaderboard')}>
          <span>🏆</span>
          <p>Leaderboard</p>
        </div>

        <div className="link-card" onClick={() => navigate('/profile')}>
          <span>👤</span>
          <p>Profile</p>
        </div>
      </div>

    </div >
  )
}

export default DashboardHome
