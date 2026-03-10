const express = require('express')
const router = express.Router()
const Submission = require('../models/Submission')
const auth = require('../middleware/authMiddleware')

// GET all submissions for the current user
router.get('/me', auth, async (req, res) => {
  try {
    const submissions = await Submission.find({ user: req.user.id })
      .populate('problem', 'title difficulty')
      .sort({ createdAt: -1 })
    res.json(submissions)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch global submissions' })
  }
})

// GET submissions for a problem (current user)
router.get('/problem/:id', auth, async (req, res) => {
  try {
    const submissions = await Submission.find({
      user: req.user.id,
      problem: req.params.id
    }).sort({ createdAt: -1 })

    res.json(submissions)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch submissions' })
  }
})

module.exports = router
