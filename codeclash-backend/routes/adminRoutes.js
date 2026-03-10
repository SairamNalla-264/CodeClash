const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const adminMiddleware = require('../middleware/adminMiddleware')
const User = require('../models/User')
const router = express.Router()

// Admin dashboard test
router.get('/dashboard', authMiddleware, adminMiddleware, (req, res) => {
  res.json({ message: 'Admin access granted' })
})

// Get all users (ADMIN ONLY)
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password')
    res.json(users)
  } catch {
    res.status(500).json({ message: 'Failed to fetch users' })
  }
})

// UPDATE USER ROLE (ADMIN ONLY)
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

// GET GLOBAL STATS (ADMIN ONLY)
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const Problem = require('../models/Problem')
    const Battle = require('../models/Battle')

    const [users, problems, battles] = await Promise.all([
      User.countDocuments(),
      Problem.countDocuments(),
      Battle.countDocuments()
    ])

    res.json({ users, problems, battles })
  } catch {
    res.status(500).json({ message: 'Failed to fetch global stats' })
  }
})

// GET ALL BATTLES (ADMIN ONLY)
router.get('/battles', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const Battle = require('../models/Battle')
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
