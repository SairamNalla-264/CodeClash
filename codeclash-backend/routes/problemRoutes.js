const express = require('express')
const router = express.Router()
const Problem = require('../models/Problem')
const User = require('../models/User')
const authMiddleware = require('../middleware/authMiddleware')

/**
 * ✅ GET DAILY CHALLENGE
 */
router.get('/daily', async (req, res) => {
  try {
    const problems = await Problem.find().select('_id title difficulty topics')
    if (problems.length === 0) return res.status(404).json({ message: 'No challenges' })

    // Simple deterministic pick: day of year % count
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24))
    const daily = problems[dayOfYear % problems.length]

    res.json(daily)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch daily' })
  }
})

/**
 * ✅ GET RECOMMENDED PROBLEMS (Content-Based Filtering)
 */
router.get('/recommendations', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('solvedProblems')
    if (!user) return res.status(404).json({ message: 'User not found' })

    const solvedProblemIds = user.solvedProblems.map(p => p._id.toString())

    // 1. Extract topics from solved problems
    const solvedTopics = {}
    user.solvedProblems.forEach(p => {
      p.topics.forEach(topic => {
        solvedTopics[topic] = (solvedTopics[topic] || 0) + 1
      })
    })

    // 2. Fetch all unsolved problems
    const allProblems = await Problem.find({ _id: { $nin: solvedProblemIds } })
      .select('title difficulty topics')
      .lean()

    // 3. Score problems based on topic overlap
    const recommendations = allProblems.map(problem => {
      let score = 0
      problem.topics.forEach(topic => {
        if (solvedTopics[topic]) {
          score += solvedTopics[topic] // Weight by frequency of topic in solved set
        }
      })
      return { ...problem, score }
    })

    // 4. Sort by score and take top 5
    const topRecs = recommendations
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    // fallback if no recommendations (e.g. new user)
    if (topRecs.length === 0) {
      const fallback = allProblems.slice(0, 5)
      return res.json(fallback)
    }

    res.json(topRecs)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch recommendations', error: err.message })
  }
})

/**
 * ✅ GET ALL PROBLEMS (Practice page)
 */
router.get('/', async (req, res) => {
  try {
    const problems = await Problem.find()
      .select('title difficulty topics')
      .lean()

    res.json(problems)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch problems' })
  }
})

/**
 * ✅ GET SINGLE PROBLEM (Problem Details page)
 */
router.get('/:id', async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id).lean()

    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' })
    }

    res.json(problem)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch problem' })
  }
})

module.exports = router
