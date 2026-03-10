import { Link, useNavigate } from 'react-router-dom'
import './Navbar.css'

const Navbar = () => {
  const navigate = useNavigate()

  // ✅ JS LOGIC GOES HERE (TOP OF COMPONENT)
  const isLoggedIn = !!localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user'))

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">

        {/* LOGO */}
        <Link to="/" className="navbar-logo">
          <span>⚔️</span>
          CodeClash
        </Link>

        {/* NAV LINKS */}
        <div className="navbar-links">
          {isLoggedIn && <Link to="/dashboard">Dashboard</Link>}
          <Link to="/practice">Practice</Link>
          <Link to="/matchmaking">Battle</Link>
          <Link to="/leaderboard">Leaderboard</Link>
          {isLoggedIn && <Link to="/profile">Profile</Link>}

          {/* ✅ ADD ADMIN LINK HERE */}
          {user?.role === 'admin' && (
            <Link to="/admin/dashboard">Admin</Link>
          )}

          {!isLoggedIn ? (
            <Link to="/login" className="navbar-cta">
              Sign In
            </Link>
          ) : (
            <button
              className="navbar-cta"
              onClick={handleLogout}
            >
              Sign Out
            </button>
          )}
        </div>

      </div>
    </nav>
  )
}

export default Navbar
