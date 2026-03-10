import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './MySubmissions.css'

const MySubmissions = () => {
    const [submissions, setSubmissions] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchSubmissions = async () => {
            const token = localStorage.getItem('token')
            try {
                const res = await fetch('http://localhost:5000/api/submissions/me', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const data = await res.json()
                setSubmissions(data)
            } catch (err) {
                console.error('Failed to fetch history', err)
            } finally {
                setLoading(false)
            }
        }
        fetchSubmissions()
    }, [])

    if (loading) return <div className="loading-container">Fetching your history...</div>

    return (
        <div className="submissions-page">
            <header className="submissions-header">
                <h1>Submission History</h1>
                <p>A record of every challenge you've faced on the platform.</p>
            </header>

            <div className="submissions-table-wrapper">
                {submissions.length === 0 ? (
                    <div className="no-data">⚔️ No submissions yet. Time to solve some problems!</div>
                ) : (
                    <table className="submissions-table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Problem</th>
                                <th>Language</th>
                                <th>Runtime</th>
                                <th>Submitted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map((sub) => (
                                <tr key={sub._id}>
                                    <td>
                                        <span className={`verdict-tag ${sub.verdict.toLowerCase().replace(' ', '-')}`}>
                                            {sub.verdict}
                                        </span>
                                    </td>
                                    <td>
                                        <Link to={`/problems/${sub.problem?._id}`} className="problem-link">
                                            {sub.problem?.title}
                                        </Link>
                                    </td>
                                    <td>{sub.language}</td>
                                    <td>{sub.runtime || '--'}</td>
                                    <td>{new Date(sub.createdAt).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}

export default MySubmissions
