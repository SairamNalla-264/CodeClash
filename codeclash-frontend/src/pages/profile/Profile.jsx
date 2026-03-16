import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './Profile.css'
import { apiUrl } from '../../config/env'

const getSolvedCount = (user) => Array.isArray(user?.solvedProblems) ? user.solvedProblems.length : (user?.solved || 0)

const Profile = () => {
  const cachedUser = JSON.parse(localStorage.getItem('user'))
  const [user, setUser] = useState(cachedUser)
  const [activity, setActivity] = useState({})
  const [battles, setBattles] = useState([])
  const [topics, setTopics] = useState({})
  const [accuracy, setAccuracy] = useState({ accuracy: 0, total: 0, solved: 0 })

  // 1️⃣ Fetch Everything
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` }

        // Parallel Fetch
        const [uRes, aRes, bRes, tRes, accRes] = await Promise.all([
          fetch(apiUrl('/api/users/me'), { headers }),
          fetch(apiUrl('/api/users/stats/activity'), { headers }),
          fetch(apiUrl('/api/battles/history/me'), { headers }),
          fetch(apiUrl('/api/users/stats/topics'), { headers }),
          fetch(apiUrl('/api/users/stats/accuracy'), { headers })
        ])

        const [uData, aData, bData, tData, accData] = await Promise.all([
          uRes.json(), aRes.json(), bRes.json(), tRes.json(), accRes.json()
        ])

        setUser(uData)
        setActivity(aData)
        setBattles(bData)
        setTopics(tData)
        setAccuracy(accData)

        localStorage.setItem('user', JSON.stringify(uData))
      } catch (err) {
        console.error('Failed to load profile data', err)
      }
    }

    fetchData()
  }, [])

  // 2️⃣ Heatmap Generation (Last 365 Days)
  const renderHeatmap = () => {
    const cells = []
    const today = new Date()
    for (let i = 364; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const count = activity[dateStr] || 0

      let level = ''
      if (count > 0 && count < 3) level = 'level-1'
      else if (count >= 3 && count < 6) level = 'level-2'
      else if (count >= 6 && count < 10) level = 'level-3'
      else if (count >= 10) level = 'level-4'

      cells.push(
        <div
          key={dateStr}
          className={`heatmap-cell ${level}`}
          title={`${dateStr}: ${count} problems solved`}
        ></div>
      )
    }
    return cells
  }

  if (!user) return <div className="loading-container">Gathering your stats...</div>

  return (
    <div className="profile-page">
      {/* HERO SECTION */}
      <section className="profile-hero">
        <div className="profile-avatar-large">
          {user.username?.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <h2>{user.username}</h2>
          <p>Member since {new Date(user.createdAt).toLocaleDateString()}</p>
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
            <span className="topic-tag">{user.role === 'admin' ? 'Arena Master' : 'Code Warrior'}</span>
            <Link to="/submissions" className="topic-tag" style={{ background: '#6366f1', textDecoration: 'none', color: '#fff' }}>
              View My Submissions →
            </Link>
          </div>
        </div>
      </section>

      {/* STATS GRID */}
      <section className="profile-stats-grid">
        <div className="p-stat-card">
          <h4>Solved</h4>
          <div className="p-stat-value">{getSolvedCount(user)}</div>
        </div>
        <div className="p-stat-card">
          <h4>ELO Rating</h4>
          <div className="p-stat-value highlight">{user.elo}</div>
          <div className="rank-progress">
            <div className="progress-bar" style={{ width: `${(user.elo % 200) / 200 * 100}%` }}></div>
          </div>
          <span className="rank-label">Next Rank: {Math.floor(user.elo / 200) * 200 + 200}</span>
        </div>
        <div className="p-stat-card">
          <h4>Streak</h4>
          <div className="p-stat-value">{user.streak || 0} 🔥</div>
        </div>
        <div className="p-stat-card">
          <h4>Accuracy</h4>
          <div className="p-stat-value">{accuracy.accuracy}%</div>
        </div>
      </section>

      {/* HEATMAP */}
      <section className="heatmap-section">
        <h3>{Object.values(activity).reduce((a, b) => a + b, 0)} solutions in the last year</h3>
        <div className="heatmap-container">
          {renderHeatmap()}
        </div>
      </section>

      {/* ACTIVITY FEED */}
      <section className="activity-section">
        <div className="activity-card">
          <h3>Recent Battles</h3>
          <div className="recent-list">
            {battles.length > 0 ? (
              battles.map(b => {
                const opponent = b.players.find(p => p.user._id !== user._id)?.user?.username || 'Unknown'
                const playerInfo = b.players.find(p => p.user._id === user._id)
                const change = playerInfo?.eloChange || 0
                return (
                  <div className="recent-item" key={b._id}>
                    <div>
                      <div className="recent-name">v/s {opponent}</div>
                      <div className="recent-date">{b.problem?.title} • {new Date(b.endTime).toLocaleDateString()}</div>
                    </div>
                    <div className="recent-score" style={{ color: change >= 0 ? '#10b981' : '#ef4444' }}>
                      {change >= 0 ? `+${change}` : change} ELO
                    </div>
                  </div>
                )
              })
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.3)', marginTop: '10px' }}>No battles yet. Enter the arena to start!</p>
            )}
          </div>
        </div>

        <div className="activity-card">
          <h3>Top Topics</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '15px' }}>
            {Object.keys(topics).length > 0 ? (
              Object.entries(topics).map(([topic, count]) => (
                <div className="topic-tag" key={topic}>{topic} ({count})</div>
              ))
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.3)' }}>Solve problems to build your topic profile.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Profile
