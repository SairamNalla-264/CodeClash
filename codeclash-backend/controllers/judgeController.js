const vm = require('vm')
const Problem = require('../models/Problem')

exports.runCode = async (req, res) => {
  const { problemId, code, language } = req.body


  try {
    const problem = await Problem.findById(problemId)

    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' })
    }

    const results = []

    for (let test of problem.visibleTestCases) {
      const sandbox = { output: null }

      const wrappedCode = `
        ${code}
        output = solution(${test.input});
      `

      try {
        const script = new vm.Script(wrappedCode)
        const context = vm.createContext(sandbox)
        script.runInContext(context, { timeout: 1000 })

        const passed = String(sandbox.output) === String(test.output)

        results.push({
          input: test.input,
          expected: test.output,
          output: sandbox.output,
          passed
        })

      } catch (err) {
        results.push({
          input: test.input,
          expected: test.output,
          output: err.message,
          passed: false
        })
      }
    }

    res.json({ results })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Run failed' })
  }
}
exports.submitCode = async (req, res) => {
  const { problemId, code, language } = req.body
  const userId = req.user.id

  if (language !== 'javascript') {
    return res.status(400).json({ message: 'Only JS supported for now' })
  }

  try {
    const problem = await Problem.findById(problemId)
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' })
    }

    for (let test of problem.hiddenTests) {
      const sandbox = { output: null }
      const wrappedCode = `
        ${code}
        output = solution(${test.input});
      `

      try {
        const script = new vm.Script(wrappedCode)
        const context = vm.createContext(sandbox)
        script.runInContext(context, { timeout: 1000 })

        if (String(sandbox.output) !== String(test.output)) {
          return res.json({
            verdict: 'Wrong Answer'
          })
        }

      } catch (err) {
        return res.json({
          verdict: 'Runtime Error',
          error: err.message
        })
      }
    }

    // ✅ ALL TESTS PASSED → ACCEPTED
    await User.findByIdAndUpdate(userId, {
      $addToSet: { solvedProblems: problemId },
      $inc: { solved: 1 }
    })

    res.json({
      verdict: 'Accepted'
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Submission failed' })
  }
}
