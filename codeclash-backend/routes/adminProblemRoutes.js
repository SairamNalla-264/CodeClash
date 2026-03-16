const express = require('express')
const Problem = require('../models/Problem')
const User = require('../models/User')
const Submission = require('../models/Submission')
const Battle = require('../models/Battle')
const authMiddleware = require('../middleware/authMiddleware')
const adminMiddleware = require('../middleware/adminMiddleware')

const router = express.Router()
const LANGUAGES = ['javascript', 'python', 'java', 'cpp']

const normalizeStringArray = (values = []) =>
  Array.isArray(values) ? values.map((value) => String(value).trim()).filter(Boolean) : []

const normalizeExample = (example = {}) => ({
  input: String(example.input || '').trim(),
  output: String(example.output || '').trim(),
  explanation: String(example.explanation || '').trim()
})

const normalizeTestCase = (testCase = {}) => ({
  input: String(testCase.input || '').trim(),
  output: String(testCase.output || '').trim()
})

const normalizeCodeMap = (map = {}) => {
  const normalized = {}
  LANGUAGES.forEach((language) => {
    normalized[language] = String(map[language] || '').trim()
  })
  return normalized
}

const validateProblemPayload = (payload) => {
  const title = String(payload.title || '').trim()
  const description = String(payload.description || '').trim()
  const difficulty = String(payload.difficulty || '').trim()
  const topics = normalizeStringArray(payload.topics)
  const companies = normalizeStringArray(payload.companies)
  const constraints = normalizeStringArray(payload.constraints)
  const examples = Array.isArray(payload.examples) ? payload.examples.map(normalizeExample) : []
  const visibleTestCases = Array.isArray(payload.visibleTestCases) ? payload.visibleTestCases.map(normalizeTestCase) : []
  const hiddenTestCases = Array.isArray(payload.hiddenTestCases) ? payload.hiddenTestCases.map(normalizeTestCase) : []
  const starterCode = normalizeCodeMap(payload.starterCode)
  const driverCode = normalizeCodeMap(payload.driverCode)

  if (!title) return { error: 'Title is required' }
  if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) return { error: 'Difficulty must be Easy, Medium, or Hard' }
  if (!description) return { error: 'Description is required' }
  if (topics.length === 0) return { error: 'At least one topic is required' }
  if (constraints.length === 0) return { error: 'At least one constraint is required' }
  if (examples.length === 0 || examples.some((example) => !example.input || !example.output)) {
    return { error: 'At least one valid example is required' }
  }
  if (visibleTestCases.length === 0 || visibleTestCases.some((testCase) => !testCase.input || !testCase.output)) {
    return { error: 'At least one valid visible test case is required' }
  }
  if (hiddenTestCases.length === 0 || hiddenTestCases.some((testCase) => !testCase.input || !testCase.output)) {
    return { error: 'At least one valid hidden test case is required' }
  }

  for (const language of LANGUAGES) {
    if (!starterCode[language]) {
      return { error: `Starter code is required for ${language}` }
    }
    if (!driverCode[language]) {
      return { error: `Driver code is required for ${language}` }
    }
  }

  return {
    value: {
      title,
      difficulty,
      topics,
      companies,
      description,
      constraints,
      examples,
      visibleTestCases,
      hiddenTestCases,
      starterCode,
      driverCode
    }
  }
}

router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { error, value } = validateProblemPayload(req.body)
    if (error) {
      return res.status(400).json({ message: error })
    }

    const problem = new Problem({
      ...value,
      createdBy: req.user.id
    })

    await problem.save()
    res.status(201).json(problem)
  } catch (err) {
    res.status(400).json({ message: 'Failed to add problem', error: err.message })
  }
})

router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const problems = await Problem.find().sort({ createdAt: -1 })
    res.json(problems)
  } catch {
    res.status(500).json({ message: 'Failed to fetch problems' })
  }
})

router.get('/:id', authMiddleware, adminMiddleware, async (req, res) => {
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

router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { error, value } = validateProblemPayload(req.body)
    if (error) {
      return res.status(400).json({ message: error })
    }

    const updated = await Problem.findByIdAndUpdate(
      req.params.id,
      value,
      { new: true, runValidators: true }
    )
    res.json(updated)
  } catch (err) {
    res.status(400).json({ message: 'Failed to update problem', error: err.message })
  }
})

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' })
    }

    await Promise.all([
      Submission.deleteMany({ problem: problem._id }),
      Battle.deleteMany({ problem: problem._id }),
      User.updateMany(
        { solvedProblems: problem._id },
        { $pull: { solvedProblems: problem._id } }
      ),
      Problem.findByIdAndDelete(problem._id)
    ])

    res.json({ message: 'Problem deleted successfully' })
  } catch (err) {
    res.status(400).json({ message: 'Failed to delete problem', error: err.message })
  }
})

module.exports = router
