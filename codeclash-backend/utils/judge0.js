const axios = require('axios')

const runOnJudge0 = async ({ source_code, language_id, stdin }) => {
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
