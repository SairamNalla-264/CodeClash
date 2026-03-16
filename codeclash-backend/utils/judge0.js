const axios = require('axios')

const runMockJudge = ({ source_code, stdin }) => {
  const input = String(stdin || '').trim()

  if (source_code.includes('__MOCK_ADD__')) {
    const numbers = input
      .split(/\s+/)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))

    return {
      stdout: `${numbers.reduce((sum, value) => sum + value, 0)}\n`,
      stderr: null,
      compile_output: null,
      time: '0.01'
    }
  }

  if (source_code.includes('__MOCK_ECHO__')) {
    return {
      stdout: `${input}\n`,
      stderr: null,
      compile_output: null,
      time: '0.01'
    }
  }

  throw new Error('Unsupported JUDGE0_MOCK source. Add a mock marker to the submitted code.')
}

const runOnJudge0 = async ({ source_code, language_id, stdin }) => {
  if (process.env.JUDGE0_MOCK === '1') {
    return runMockJudge({ source_code, stdin })
  }

  if (!process.env.JUDGE0_KEY) {
    throw new Error('JUDGE0_KEY is missing in environment variables. Please add your RapidAPI key to the .env file.')
  }
  const response = await axios.post(
    'https://judge0-ce.p.rapidapi.com/submissions?wait=true',
    {
      source_code,
      language_id,
      stdin
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': process.env.JUDGE0_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
      }
    }
  )

  return response.data
}

module.exports = runOnJudge0
