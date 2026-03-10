import { useEffect, useState } from 'react'
import './ManageUsers.css'

const ManageUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('token')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        setUsers(data)
      } catch (err) {
        console.error('Failed to load users', err)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [token])

  const updateRole = async (id, role) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role })
      })
      const updatedUser = await res.json()
      setUsers(users.map(u => (u._id === id ? updatedUser : u)))
    } catch (err) {
      alert('Failed to update role')
    }
  }

  if (loading) return <div className="loading-screen">Scanning citizen database...</div>

  return (
    <div className="admin-users">
      <h2>Citizen Registry</h2>

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Elo</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{user.username}</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{user.email}</div>
                </td>
                <td style={{ color: '#6366f1', fontWeight: 700 }}>{user.elo}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <button
                    className="role-btn"
                    onClick={() => updateRole(user._id, user.role === 'admin' ? 'user' : 'admin')}
                  >
                    {user.role === 'admin' ? 'Demote to User' : 'Grant Admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ManageUsers
