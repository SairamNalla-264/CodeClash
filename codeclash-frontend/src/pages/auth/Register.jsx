import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import './Register.css'


const Register = () => {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleRegister = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message)
        return
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      if (data.user.role === 'admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/dashboard')
      }

    } catch (err) {
      setError('Server error. Please try again.')
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message)
        return
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      if (data.user.role === 'admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError('Google login failed')
    }
  }


  return (
    <div className="register-page">
      <div className="register-card">

        {/* LOGO */}
        <div className="register-logo">
          <span>⚔️</span> CodeClash
        </div>

        {/* ERROR */}
        {error && (
          <p style={{ color: 'red', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
            {error}
          </p>
        )}

        {/* INPUTS */}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {/* REGISTER BUTTON */}
        <button className="register-btn" onClick={handleRegister}>
          Create Account
        </button>

        {/* DIVIDER */}
        <div className="auth-divider">or sign up with</div>

        {/* GOOGLE BUTTON */}
        <div className="google-btn-container">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google login failed')}
            useOneTap
            theme="filled_black"
            shape="pill"
            text="signup_with"
            width="100%"
          />
        </div>


        {/* FOOTER */}
        <div className="register-footer">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>

      </div>
    </div>
  )
}

export default Register
