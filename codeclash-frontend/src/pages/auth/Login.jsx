import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import './Login.css'
import { GOOGLE_CLIENT_ID, apiUrl } from '../../config/env'


const Login = () => {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message)
        return
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      // ✅ ROLE BASED REDIRECT
      if (data.user.role === 'admin') {
        console.log('Logged in user role:', data.user.role)
        navigate('/admin/dashboard')
      } else {
        console.log('Logged in user role:', data.user.role)
        navigate('/dashboard')
      }

    } catch {
      setError('Server error')
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await fetch(apiUrl('/api/auth/google'), {
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
    } catch {
      setError('Google login failed')
    }
  }



  return (
    <div className="login-page">
      <div className="login-card">

        {/* LOGO */}
        <div className="login-logo">
          <span>⚔️</span> CodeClash
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <p style={{ color: 'red', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
            {error}
          </p>
        )}

        {/* INPUTS */}
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

        {/* LOGIN BUTTON */}
        <button className="login-btn" onClick={handleLogin}>
          Sign In
        </button>

        {/* DIVIDER */}
        {GOOGLE_CLIENT_ID && (
          <>
            <div className="auth-divider">or sign in with</div>

            <div className="google-btn-container">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google login failed')}
                useOneTap
                theme="filled_black"
                shape="pill"
                text="signin_with"
                width="100%"
              />
            </div>
          </>
        )}


        {/* FOOTER LINKS */}
        <div className="login-footer">
          <Link to="/register">Sign Up</Link>
        </div>

      </div>
    </div>
  )
}



export default Login
