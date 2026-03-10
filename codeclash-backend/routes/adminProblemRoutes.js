const express = require('express')
const Problem = require('../models/Problem')
const authMiddleware = require('../middleware/authMiddleware')
const adminMiddleware = require('../middleware/adminMiddleware')

const router = express.Router()

// ➕ ADD PROBLEM (ADMIN ONLY)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const problem = new Problem({
      ...req.body,
      createdBy: req.user.id
    })

    await problem.save()
    res.status(201).json(problem)
  } catch (err) {
    res.status(400).json({ message: 'Failed to add problem', error: err.message })
  }
})

// 📄 GET ALL PROBLEMS
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const problems = await Problem.find().sort({ createdAt: -1 })
    res.json(problems)
  } catch {
    res.status(500).json({ message: 'Failed to fetch problems' })
  }
})

// 📄 GET SINGLE PROBLEM
router.get('/:id',  adminMiddleware,authMiddleware, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' })
    }
    res.json(problem)
  } catch {
    res.status(400).json({ message: 'Invalid problem ID' })
  }
})

// ✏️ UPDATE PROBLEM
router.put('/:id', adminMiddleware,authMiddleware, async (req, res) => {
  try {
    const updated = await Problem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    res.json(updated)
  } catch {
    res.status(400).json({ message: 'Failed to update problem' })
  }
})

// ❌ DELETE PROBLEM
router.delete('/:id', adminMiddleware,authMiddleware, async (req, res) => {
  try {
    await Problem.findByIdAndDelete(req.params.id)
    res.json({ message: 'Problem deleted successfully' })
  } catch {
    res.status(400).json({ message: 'Failed to delete problem' })
  }
})

module.exports = router
