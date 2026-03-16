const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const adminMiddleware = require('../middleware/adminMiddleware')
const User = require('../models/User')
const Problem = require('../models/Problem')
const Battle = require('../models/Battle')
const Submission = require('../models/Submission')

const router = express.Router()

router.get('/dashboard', authMiddleware, adminMiddleware, (req, res) => {
  res.json({ message: 'Admin access granted' })
})

router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password')
    res.json(users)
  } catch {
    res.status(500).json({ message: 'Failed to fetch users' })
  }
})

router.patch('/users/:id/role', authMiddleware, adminMiddleware, async (req, res) => {
  const { role } = req.body

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' })
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password')

    res.json(user)
  } catch {
    res.status(500).json({ message: 'Failed to update role' })
  }
})

router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' })
    }

    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const problemIds = await Problem.find({ createdBy: user._id }).distinct('_id')

    await Promise.all([
      Submission.deleteMany({
        $or: [
          { user: user._id },
          ...(problemIds.length > 0 ? [{ problem: { $in: problemIds } }] : [])
        ]
      }),
      Battle.deleteMany({
        $or: [
          { 'players.user': user._id },
          { winner: user._id },
          ...(problemIds.length > 0 ? [{ problem: { $in: problemIds } }] : [])
        ]
      }),
      User.updateMany(
        { solvedProblems: { $in: problemIds } },
        { $pull: { solvedProblems: { $in: problemIds } } }
      ),
      Problem.deleteMany({ createdBy: user._id }),
      User.findByIdAndDelete(user._id)
    ])

    res.json({ message: 'User deleted successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete user', error: err.message })
  }
})

router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const monthStarts = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      return date
    })

    const monthLabels = monthStarts.map((date) =>
      date.toLocaleString('en-US', { month: 'short' })
    )

    const monthRanges = monthStarts.map((start, index) => ({
      label: monthLabels[index],
      start,
      end: index === monthStarts.length - 1
        ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
        : monthStarts[index + 1]
    }))

    const [
      users,
      problems,
      battles,
      submissions,
      acceptedSubmissions,
      activeBattles,
      completedBattles,
      usersLast24Hours,
      submissionsLast24Hours,
      battlesLast24Hours,
      monthlyUsers,
      monthlySubmissions,
      monthlyBattles
    ] = await Promise.all([
      User.countDocuments(),
      Problem.countDocuments(),
      Battle.countDocuments(),
      Submission.countDocuments(),
      Submission.countDocuments({ verdict: 'Accepted' }),
      Battle.countDocuments({ status: 'active' }),
      Battle.countDocuments({ status: 'completed' }),
      User.countDocuments({ createdAt: { $gte: dayAgo } }),
      Submission.countDocuments({ createdAt: { $gte: dayAgo } }),
      Battle.countDocuments({ createdAt: { $gte: dayAgo } }),
      Promise.all(monthRanges.map(({ start, end }) =>
        User.countDocuments({ createdAt: { $gte: start, $lt: end } })
      )),
      Promise.all(monthRanges.map(({ start, end }) =>
        Submission.countDocuments({ createdAt: { $gte: start, $lt: end } })
      )),
      Promise.all(monthRanges.map(({ start, end }) =>
        Battle.countDocuments({ createdAt: { $gte: start, $lt: end } })
      ))
    ])

    const successRate = submissions > 0
      ? Math.round((acceptedSubmissions / submissions) * 100)
      : 0

    const engagementRate = users > 0
      ? Math.round((completedBattles / users) * 100)
      : 0

    const growth = monthRanges.map(({ label }, index) => ({
      label,
      users: monthlyUsers[index],
      submissions: monthlySubmissions[index],
      battles: monthlyBattles[index]
    }))

    res.json({
      users,
      problems,
      battles,
      submissions,
      acceptedSubmissions,
      activeBattles,
      completedBattles,
      usersLast24Hours,
      submissionsLast24Hours,
      battlesLast24Hours,
      successRate,
      engagementRate,
      growth
    })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch global stats', error: err.message })
  }
})

router.get('/battles', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const battles = await Battle.find()
      .populate('players.user', 'username')
      .populate('problem', 'title')
      .sort({ createdAt: -1 })
      .limit(50)

    res.json(battles)
  } catch {
    res.status(500).json({ message: 'Failed to fetch battles' })
  }
})

module.exports = router
