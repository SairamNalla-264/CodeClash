const assert = require('assert/strict')
const path = require('path')
const { spawn } = require('child_process')
const mongoose = require('mongoose')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const User = require('../models/User')
const Problem = require('../models/Problem')
const Battle = require('../models/Battle')
const Submission = require('../models/Submission')

const PORT = process.env.TEST_PORT || '5051'
const BASE_URL = process.env.TEST_BASE_URL || `http://127.0.0.1:${PORT}`
const REQUEST_TIMEOUT_MS = 15000

const trackedIds = {
  users: [],
  problems: [],
  battles: []
}

const serverLogs = []
let serverProcess = null

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const trackId = (bucket, value) => {
  if (!value) return
  trackedIds[bucket].push(String(value))
}

const readJson = async (response) => {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

const request = async (pathname, options = {}) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      method: options.method || 'GET',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    })

    const payload = await readJson(response)
    if (options.expectedStatus !== undefined) {
      assert.equal(
        response.status,
        options.expectedStatus,
        `Expected ${options.expectedStatus} for ${pathname}, got ${response.status}: ${JSON.stringify(payload)}`
      )
    }

    return { response, payload }
  } finally {
    clearTimeout(timeout)
  }
}

const waitForServer = async () => {
  const startedAt = Date.now()

  while (Date.now() - startedAt < 30000) {
    try {
      const { response } = await request('/api/problems')
      if (response.ok) return
    } catch (error) {
      if (Date.now() - startedAt >= 30000) {
        throw error
      }
    }

    await sleep(500)
  }

  throw new Error('Timed out waiting for backend server to start')
}

const startServer = async () => {
  if (process.env.SMOKE_SKIP_SERVER_START === '1') {
    await waitForServer()
    return
  }

  serverProcess = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT,
      JUDGE0_MOCK: '1'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  serverProcess.stdout.on('data', (chunk) => {
    serverLogs.push(chunk.toString())
  })

  serverProcess.stderr.on('data', (chunk) => {
    serverLogs.push(chunk.toString())
  })

  serverProcess.on('exit', (code) => {
    serverLogs.push(`SERVER_EXIT:${code}`)
  })

  await waitForServer()
}

const registerUser = async (tag, suffix) => {
  const body = {
    username: `${tag}_${suffix}`,
    email: `${tag}_${suffix}@example.com`,
    password: 'Password123!'
  }

  const { payload } = await request('/api/auth/register', {
    method: 'POST',
    body,
    expectedStatus: 201
  })

  trackId('users', payload.user.id)
  return payload
}

const loginUser = async (email, password) => {
  const { payload } = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    expectedStatus: 200
  })

  return payload
}

const createProblemPayload = (title, difficulty) => ({
  title,
  difficulty,
  topics: ['Arrays', 'Math'],
  companies: ['Acme'],
  description: 'Return the sum of integers from stdin.',
  constraints: ['1 <= numbers.length <= 10'],
  examples: [
    {
      input: '2 3',
      output: '5',
      explanation: '2 + 3 = 5'
    }
  ],
  visibleTestCases: [
    { input: '1 2', output: '3' },
    { input: '5 7', output: '12' }
  ],
  hiddenTestCases: [
    { input: '10 15', output: '25' },
    { input: '8 9', output: '17' }
  ],
  starterCode: {
    javascript: '// __MOCK_ADD__\nfunction solve(input) {\n  return input\n}\n',
    python: '# placeholder',
    java: '// placeholder',
    cpp: '// placeholder'
  },
  driverCode: {
    javascript: '// js driver',
    python: '# py driver',
    java: '// java driver',
    cpp: '// cpp driver'
  }
})

const cleanup = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI)
  }

  if (trackedIds.battles.length > 0) {
    await Battle.deleteMany({ _id: { $in: trackedIds.battles } })
  }

  if (trackedIds.problems.length > 0) {
    await Submission.deleteMany({ problem: { $in: trackedIds.problems } })
    await Problem.deleteMany({ _id: { $in: trackedIds.problems } })
  }

  if (trackedIds.users.length > 0) {
    await Submission.deleteMany({ user: { $in: trackedIds.users } })
    await User.deleteMany({ _id: { $in: trackedIds.users } })
  }

  await mongoose.disconnect()

  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill()
    await sleep(500)
  }
}

const main = async () => {
  const tag = `smoke_${Date.now()}`

  await startServer()
  await mongoose.connect(process.env.MONGO_URI)

  const adminRegistration = await registerUser(tag, 'admin')
  await registerUser(tag, 'player1')
  await registerUser(tag, 'player2')
  await registerUser(tag, 'outsider')

  await User.findByIdAndUpdate(adminRegistration.user.id, { role: 'admin' })

  const adminLogin = await loginUser(adminRegistration.user.email, 'Password123!')
  const playerOneLogin = await loginUser(`${tag}_player1@example.com`, 'Password123!')
  const playerTwoLogin = await loginUser(`${tag}_player2@example.com`, 'Password123!')
  const outsiderLogin = await loginUser(`${tag}_outsider@example.com`, 'Password123!')
  const outsiderUser = await User.findOne({ email: `${tag}_outsider@example.com` }).lean()

  assert.equal(adminLogin.user.role, 'admin', 'Admin login should return admin role')

  const stats = await request('/api/admin/stats', {
    token: adminLogin.token,
    expectedStatus: 200
  })
  assert.equal(typeof stats.payload.users, 'number')

  await request('/api/admin/problems', {
    method: 'POST',
    token: adminLogin.token,
    body: { title: 'Broken Problem' },
    expectedStatus: 400
  })

  const judgeProblemCreate = await request('/api/admin/problems', {
    method: 'POST',
    token: adminLogin.token,
    body: createProblemPayload(`${tag} Judge Problem`, 'Easy'),
    expectedStatus: 201
  })
  const judgeProblemId = judgeProblemCreate.payload._id
  trackId('problems', judgeProblemId)

  const editProblemCreate = await request('/api/admin/problems', {
    method: 'POST',
    token: adminLogin.token,
    body: createProblemPayload(`${tag} Edit Problem`, 'Hard'),
    expectedStatus: 201
  })
  const editProblemId = editProblemCreate.payload._id
  trackId('problems', editProblemId)

  const fetchedProblem = await request(`/api/admin/problems/${editProblemId}`, {
    token: adminLogin.token,
    expectedStatus: 200
  })
  assert.equal(fetchedProblem.payload.title, `${tag} Edit Problem`)

  const updatedPayload = createProblemPayload(`${tag} Edited Problem`, 'Hard')
  updatedPayload.companies = ['Acme', 'Globex']

  const updatedProblem = await request(`/api/admin/problems/${editProblemId}`, {
    method: 'PUT',
    token: adminLogin.token,
    body: updatedPayload,
    expectedStatus: 200
  })
  assert.equal(updatedProblem.payload.title, `${tag} Edited Problem`)

  await request(`/api/admin/problems/${editProblemId}`, {
    method: 'DELETE',
    token: adminLogin.token,
    expectedStatus: 200
  })
  trackedIds.problems = trackedIds.problems.filter((id) => id !== editProblemId)

  await request(`/api/admin/users/${adminRegistration.user.id}`, {
    method: 'DELETE',
    token: adminLogin.token,
    expectedStatus: 400
  })

  await request(`/api/admin/users/${outsiderUser._id}`, {
    method: 'DELETE',
    token: adminLogin.token,
    expectedStatus: 200
  })
  trackedIds.users = trackedIds.users.filter((id) => id !== String(outsiderUser._id))

  const deletedOutsider = await User.findById(outsiderUser._id).lean()
  assert.equal(deletedOutsider, null, 'Deleted user should be removed from the database')

  const battleProblem = await Problem.findById(judgeProblemId).lean()
  assert.ok(battleProblem, 'Judge problem should exist in the database')

  const runResponse = await request('/api/judge/run', {
    method: 'POST',
    token: playerOneLogin.token,
    body: {
      problemId: judgeProblemId,
      language: 'javascript',
      code: '// __MOCK_ADD__\nfunction solve(input) {\n  return input\n}\n'
    },
    expectedStatus: 200
  })
  assert.equal(runResponse.payload.status, 'Accepted')
  assert.equal(runResponse.payload.results.length, 2)
  assert.ok(runResponse.payload.results.every((result) => result.passed))

  const submitResponse = await request('/api/judge/submit', {
    method: 'POST',
    token: playerOneLogin.token,
    body: {
      problemId: judgeProblemId,
      language: 'javascript',
      code: '// __MOCK_ADD__\nfunction solve(input) {\n  return input\n}\n'
    },
    expectedStatus: 200
  })
  assert.equal(submitResponse.payload.verdict, 'Accepted')
  assert.equal(submitResponse.payload.passedCount, submitResponse.payload.totalCount)
  assert.ok(submitResponse.payload.totalCount >= 1)

  const submissionHistory = await request(`/api/submissions/problem/${judgeProblemId}`, {
    token: playerOneLogin.token,
    expectedStatus: 200
  })
  assert.ok(submissionHistory.payload.length >= 1, 'Submission history should include the accepted submission')

  const firstMatch = await request('/api/battles/match', {
    method: 'POST',
    token: playerOneLogin.token,
    body: { difficulty: 'Easy' },
    expectedStatus: 201
  })
  assert.equal(firstMatch.payload.status, 'waiting')
  trackId('battles', firstMatch.payload._id)

  const secondMatch = await request('/api/battles/match', {
    method: 'POST',
    token: playerTwoLogin.token,
    body: { difficulty: 'Easy' },
    expectedStatus: 200
  })
  assert.equal(secondMatch.payload.status, 'active')
  assert.equal(secondMatch.payload._id, firstMatch.payload._id)

  const battleDetails = await request(`/api/battles/${firstMatch.payload._id}`, {
    token: playerOneLogin.token,
    expectedStatus: 200
  })
  assert.equal(battleDetails.payload.status, 'active')
  assert.equal(battleDetails.payload.players.length, 2)
  assert.equal(typeof battleDetails.payload.remainingSeconds, 'number')

  await request(`/api/battles/${firstMatch.payload._id}`, {
    token: outsiderLogin.token,
    expectedStatus: 403
  })

  console.log('Integration smoke test passed')
}

main()
  .catch(async (error) => {
    console.error('Integration smoke test failed')
    console.error(error)
    if (serverLogs.length > 0) {
      console.error('\nServer logs:')
      console.error(serverLogs.join(''))
    }
    process.exitCode = 1
  })
  .finally(async () => {
    await cleanup()
  })
