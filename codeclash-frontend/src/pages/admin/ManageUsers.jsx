import { useEffect, useState } from 'react'
import './ManageUsers.css'
import { apiUrl } from '../../config/env'

const ManageUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('token')
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(apiUrl('/api/admin/users'), {
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
      const res = await fetch(apiUrl(`/api/admin/users/${id}/role`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role })
      })
      const updatedUser = await res.json()
      if (!res.ok) {
        alert(updatedUser.message || 'Failed to update role')
        return
      }
      setUsers(users.map(u => (u._id === id ? updatedUser : u)))
    } catch {
      alert('Failed to update role')
    }
  }

  const deleteUser = async (id, username) => {
    if (currentUser?._id === id || currentUser?.id === id) {
      alert('You cannot delete your own account')
      return
    }

    if (!window.confirm(`Delete ${username}? This also removes their submissions, battles, and authored problems.`)) {
      return
    }

    try {
      const res = await fetch(apiUrl(`/api/admin/users/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.message || 'Failed to delete user')
        return
      }

      setUsers((prev) => prev.filter((user) => user._id !== id))
    } catch {
      alert('Failed to delete user')
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
                  <div className="user-actions">
                    <button
                      className="role-btn"
                      onClick={() => updateRole(user._id, user.role === 'admin' ? 'user' : 'admin')}
                    >
                      {user.role === 'admin' ? 'Demote to User' : 'Grant Admin'}
                    </button>
                    <button
                      className="delete-user-btn"
                      onClick={() => deleteUser(user._id, user.username)}
                      disabled={currentUser?._id === user._id || currentUser?.id === user._id}
                    >
                      Delete User
                    </button>
                  </div>
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
