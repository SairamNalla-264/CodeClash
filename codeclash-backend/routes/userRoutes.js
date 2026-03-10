const express = require('express')
const User = require('../models/User')
const Problem = require('../models/Problem')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

// GET LEADERBOARD
router.get('/leaderboard', async (req, res) => {
  try {
    const topUsers = await User.find()
      .sort({ solved: -1, elo: -1 })
      .limit(50)
      .select('username solved elo streak')
    res.json(topUsers)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch leaderboard' })
  }
})

// GET ACTIVITY DATA (HEATMAP)
router.get('/stats/activity', authMiddleware, async (req, res) => {
  try {
    const submissions = await require('../models/Submission').find({
      user: req.user.id,
      verdict: 'Accepted'
    }).select('createdAt')

    // Count by date string (YYYY-MM-DD)
    const activity = {}
    submissions.forEach(s => {
      const date = s.createdAt.toISOString().split('T')[0]
      activity[date] = (activity[date] || 0) + 1
    })

    res.json(activity)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch activity' })
  }
})

// GET LOGGED-IN USER DATA
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    res.json(user)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET TOPICS STATS
router.get('/stats/topics', authMiddleware, async (req, res) => {
  try {
    const User = require('../models/User')
    const Problem = require('../models/Problem')
    const user = await User.findById(req.user.id).select('solvedProblems')

    // Aggregation of topics from solved problems
    const solvedProblems = await Problem.find({ _id: { $in: user.solvedProblems } }).select('topics')
    const topicCounts = {}
    solvedProblems.forEach(p => {
      p.topics.forEach(t => {
        topicCounts[t] = (topicCounts[t] || 0) + 1
      })
    })

    res.json(topicCounts)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch topic stats' })
  }
})

// GET ACCURACY STATS
router.get('/stats/accuracy', authMiddleware, async (req, res) => {
  try {
    const Submission = require('../models/Submission')
    const total = await Submission.countDocuments({ user: req.user.id })
    const solved = await Submission.countDocuments({ user: req.user.id, verdict: 'Accepted' })

    const accuracy = total > 0 ? Math.round((solved / total) * 100) : 0
    res.json({ accuracy, total, solved })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch accuracy' })
  }
})

/**
 * ✅ GET COLLABORATIVE RECOMMENDATIONS
 * Finds similar users and recommends problems they've solved
 */
router.get('/recommendations/collaborative', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id)
    const solvedSet = new Set(currentUser.solvedProblems.map(id => id.toString()))

    // 1. Find other users
    const otherUsers = await User.find({ _id: { $ne: req.user.id } })
      .select('solvedProblems')
      .lean()

    // 2. Calculate similarity (Jaccard Similarity)
    const similarities = otherUsers.map(user => {
      const otherSolvedSet = new Set(user.solvedProblems.map(id => id.toString()))

      const intersection = [...solvedSet].filter(x => otherSolvedSet.has(x)).length
      const union = new Set([...solvedSet, ...otherSolvedSet]).size

      const similarity = union === 0 ? 0 : intersection / union
      return { userId: user._id, similarity, solvedProblems: user.solvedProblems }
    })

    // 3. Sort by similarity and get candidate problems from top 5 similar users
    const topSimilarUsers = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)

    const candidateProblemIds = new Set()
    topSimilarUsers.forEach(u => {
      u.solvedProblems.forEach(pId => {
        if (!solvedSet.has(pId.toString())) {
          candidateProblemIds.add(pId.toString())
        }
      })
    })

    // 4. Fetch problem details for the candidates
    const recommendedProblems = await Problem.find({ _id: { $in: [...candidateProblemIds] } })
      .select('title difficulty topics')
      .limit(5)
      .lean()

    res.json(recommendedProblems)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch collaborative recommendations', error: err.message })
  }
})

module.exports = router
