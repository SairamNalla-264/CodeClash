const express = require('express')
const router = express.Router()

const authMiddleware = require('../middleware/authMiddleware')
const Problem = require('../models/Problem')
const Submission = require('../models/Submission')
const User = require('../models/User')
const runOnJudge0 = require('../utils/judge0')

/* ===============================
   Language Mapping (Judge0)
================================ */
const languageMap = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54
}

/* ===============================
   Helper: Join Code & Driver
================================ */
const joinCodeWithDriver = (code, driver, language) => {
  if (!driver) return code;

  if (language === 'java' || language === 'cpp') {
    const lines = (code + '\n' + driver).split('\n');
    const imports = [];
    const body = [];

    const importRegex = language === 'java' ? /^import\s+/ : /^#include\s+/;

    lines.forEach(line => {
      if (importRegex.test(line.trim())) {
        imports.push(line);
      } else {
        body.push(line);
      }
    });

    return [...new Set(imports)].join('\n') + '\n\n' + body.join('\n');
  }

  // Default for other languages
  return code + '\n' + driver;
}

/* =====================================================
   RUN CODE → Visible Test Cases (NO DB UPDATE)
===================================================== */
router.post('/run', authMiddleware, async (req, res) => {
  try {
    const { problemId, language, code } = req.body

    /* ---------- Basic validation ---------- */
    if (!problemId || !language) {
      return res.status(400).json({ message: 'Missing fields' })
    }

    if (!code || !code.trim()) {
      return res.status(400).json({ message: 'Code cannot be empty' })
    }

    const languageId = languageMap[language]
    if (!languageId) {
      return res.status(400).json({ message: 'Unsupported language' })
    }

    const problem = await Problem.findById(problemId)
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' })
    }

    if (!Array.isArray(problem.visibleTestCases) || problem.visibleTestCases.length === 0) {
      return res.status(400).json({
        message: 'No visible test cases configured for this problem',
        error: 'The Run action requires at least one visible test case.'
      })
    }

    const results = []

    for (const testCase of problem.visibleTestCases) {
      // If the problem has driverCode, append it to user's code
      // Otherwise, assume user writes full script
      // Map based driverCode access
      const langDriver = problem.driverCode?.get
        ? problem.driverCode.get(language)
        : problem.driverCode[language]

      const finalCode = joinCodeWithDriver(code, langDriver, language)

      const judgeResult = await runOnJudge0({
        source_code: finalCode,
        language_id: languageId,
        stdin: testCase.input
      })

      const stdout = (judgeResult.stdout || '').trim()
      const stderr = judgeResult.stderr || ''
      const compileError = judgeResult.compile_output || ''
      const expected = testCase.output.trim()

      let passed = false
      let output = stdout

      if (compileError || stderr) {
        passed = false
        output = compileError || stderr
      } else if (!stdout) {
        passed = false
        output = '(no output)'
      } else {
        passed = stdout === expected
      }

      results.push({
        input: testCase.input,
        output,
        expected,
        passed
      })
    }

    return res.json({
      status: results.every(r => r.passed) ? 'Accepted' : 'Failed',
      results
    })

  } catch (err) {
    const errorMessage = err.response?.data?.message || err.message || 'Run failed'
    console.error('RUN ERROR:', errorMessage)
    return res.status(500).json({
      message: 'Run failed',
      error: errorMessage
    })
  }

})

/* =====================================================
   SUBMIT CODE → Hidden Test Cases (DB UPDATE)
===================================================== */
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { problemId, language, code } = req.body

    /* ---------- Basic validation ---------- */
    if (!problemId || !language) {
      return res.status(400).json({ verdict: 'Invalid Request' })
    }

    if (!code || !code.trim()) {
      return res.status(400).json({ verdict: 'Code cannot be empty' })
    }

    const languageId = languageMap[language]
    if (!languageId) {
      return res.status(400).json({ verdict: 'Unsupported language' })
    }

    const problem = await Problem.findById(problemId)
    if (!problem) {
      return res.status(404).json({ verdict: 'Problem not found' })
    }

    let verdict = 'Accepted'
    let runtime = 0
    let passedCount = 0
    const totalCount = problem.hiddenTestCases.length

    for (const testCase of problem.hiddenTestCases) {
      // Map based driverCode access
      const langDriver = problem.driverCode?.get
        ? problem.driverCode.get(language)
        : problem.driverCode[language]

      const finalCode = joinCodeWithDriver(code, langDriver, language)

      const judgeResult = await runOnJudge0({
        source_code: finalCode,
        language_id: languageId,
        stdin: testCase.input
      })

      const stdout = (judgeResult.stdout || '').trim()
      const stderr = judgeResult.stderr || ''
      const compileError = judgeResult.compile_output || ''
      const expected = testCase.output.trim()

      runtime += Number(judgeResult.time || 0)

      if (compileError || stderr || !stdout || stdout !== expected) {
        verdict = compileError
          ? 'Compilation Error'
          : stderr
            ? 'Runtime Error'
            : 'Wrong Answer'
        break
      }

      passedCount += 1
    }

    /* ---------- Save Submission ---------- */
    await Submission.create({
      user: req.user.id,
      problem: problem._id,
      language,
      code,
      verdict,
      runtime
    })

    /* ---------- Update Problem Stats ---------- */
    problem.submissions += 1
    if (verdict === 'Accepted') {
      problem.accepted += 1
    }
    await problem.save()

    /* ---------- Update User Stats ---------- */
    if (verdict === 'Accepted') {
      const user = await User.findById(req.user.id)
      if (user) {
        const today = new Date().toISOString().split('T')[0]
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        const alreadySolved = user.solvedProblems.some(
          (solvedProblemId) => solvedProblemId.toString() === problemId.toString()
        )

        // 1. Solve Count & SolvedProblems list
        if (!alreadySolved) {
          user.solvedProblems.push(problemId)
          user.elo = (user.elo || 1200) + 10 // Practice ELO boost
        }
        user.solved = user.solvedProblems.length

        // 2. Streak logic
        if (user.lastSolvedDate === yesterday) {
          user.streak = (user.streak || 0) + 1
        } else if (user.lastSolvedDate !== today) {
          user.streak = 1
        }

        user.lastSolvedDate = today
        await user.save()
      }
    }

    return res.json({
      verdict,
      passedCount,
      totalCount
    })

  } catch (err) {
    const errorMessage = err.response?.data?.message || err.message || 'Runtime Error'
    console.error('SUBMIT ERROR:', errorMessage)
    res.status(500).json({
      verdict: 'System Error',
      error: errorMessage
    })
  }
})

module.exports = router
