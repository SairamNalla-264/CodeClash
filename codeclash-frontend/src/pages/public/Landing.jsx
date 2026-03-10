import { Link } from 'react-router-dom'
import './Landing.css'

const Landing = () => {
  return (
    <div className="landing">
      <div className="landing-container">

        {/* LEFT CLASH SYMBOL */}
        <div className="landing-clash">
  <div className="clash-ring-outer"></div>
  <div className="clash-ring"></div>
  <div className="clash-icon">⚔️</div>
</div>

        
        {/* RIGHT CONTENT */}
        <div className="landing-content">
          <h1>Code. Compete. Conquer.</h1>

          <p>
            Enter a competitive coding arena where every problem
            is a battle. Face opponents matched by Elo rating,
            climb the leaderboard, and sharpen your skills through
            real-time challenges.
          </p>

          <Link to="/register">
            <button className="cta-btn">Create Account →</button>
          </Link>
        </div>

      </div>
    </div>
  )
}

export default Landing
