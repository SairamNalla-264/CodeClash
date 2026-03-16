const Battle = require('../models/Battle')
const User = require('../models/User')
const { calculateNewRatings } = require('./eloUtils')

const BATTLE_DURATIONS = {
  Easy: 15 * 60 * 1000,
  Medium: 30 * 60 * 1000,
  Hard: 45 * 60 * 1000
}

const getPlayerUserId = (player) => {
  const rawUser = player?.user?._id || player?.user
  return rawUser ? rawUser.toString() : ''
}

const isParticipant = (battle, userId) =>
  battle.players.some((player) => getPlayerUserId(player) === userId.toString())

const getRemainingSeconds = (battle) => {
  if (!battle?.startTime || battle.status !== 'active') return 0
  const duration = BATTLE_DURATIONS[battle.difficulty] || BATTLE_DURATIONS.Medium
  const elapsed = Date.now() - new Date(battle.startTime).getTime()
  return Math.max(0, Math.ceil((duration - elapsed) / 1000))
}

const getResolutionReason = (battle) => {
  if (!battle || battle.status !== 'completed') return null
  if (!battle.startTime || !battle.endTime) return battle.winner ? 'solved' : 'completed'

  const duration = BATTLE_DURATIONS[battle.difficulty] || BATTLE_DURATIONS.Medium
  const elapsed = new Date(battle.endTime).getTime() - new Date(battle.startTime).getTime()
  if (elapsed >= duration) return 'timeout'
  return battle.winner ? 'solved' : 'completed'
}

const applyBattleResult = async (battle, winnerId = null) => {
  battle.status = 'completed'
  battle.winner = winnerId || null
  battle.endTime = new Date()

  if (!winnerId || battle.players.length !== 2) {
    await battle.save()
    return battle
  }

  const players = await Promise.all(battle.players.map((player) => User.findById(getPlayerUserId(player))))
  const winnerIndex = battle.players.findIndex((player) => getPlayerUserId(player) === winnerId.toString())
  const loserIndex = battle.players.findIndex((player) => getPlayerUserId(player) !== winnerId.toString())

  if (winnerIndex === -1 || loserIndex === -1 || !players[winnerIndex] || !players[loserIndex]) {
    await battle.save()
    return battle
  }

  const winner = players[winnerIndex]
  const loser = players[loserIndex]

  const { newRatingA, newRatingB, changeA, changeB } = calculateNewRatings(
    winner.elo,
    loser.elo,
    1
  )

  battle.players[winnerIndex].eloChange = changeA
  battle.players[loserIndex].eloChange = changeB

  winner.elo = newRatingA
  winner.streak += 1

  const problemId = battle.problem.toString()
  const alreadySolved = winner.solvedProblems.some(
    (solvedProblemId) => solvedProblemId.toString() === problemId
  )
  if (!alreadySolved) {
    winner.solvedProblems.push(problemId)
  }
  winner.solved = winner.solvedProblems.length

  loser.elo = newRatingB
  loser.streak = 0

  await Promise.all([winner.save(), loser.save()])
  await battle.save()
  return battle
}

const resolveTimedOutBattle = async (battle, io) => {
  if (!battle || battle.status !== 'active' || !battle.startTime) return battle

  const duration = BATTLE_DURATIONS[battle.difficulty] || BATTLE_DURATIONS.Medium
  const deadline = new Date(battle.startTime).getTime() + duration
  if (Date.now() < deadline) return battle

  const sortedPlayers = [...battle.players].sort((a, b) => b.progress - a.progress)
  const winnerId = sortedPlayers.length === 2 && sortedPlayers[0].progress > sortedPlayers[1].progress
    ? getPlayerUserId(sortedPlayers[0])
    : null

  await applyBattleResult(battle, winnerId)

  if (io) {
    io.to(battle._id.toString()).emit('battle_finished', {
      battleId: battle._id.toString(),
      userId: winnerId,
      reason: 'timeout'
    })
  }

  return battle
}

const sweepTimedOutBattles = async (io) => {
  const activeBattles = await Battle.find({
    status: 'active',
    startTime: { $ne: null }
  })

  for (const battle of activeBattles) {
    await resolveTimedOutBattle(battle, io)
  }
}

module.exports = {
  BATTLE_DURATIONS,
  getPlayerUserId,
  isParticipant,
  getRemainingSeconds,
  getResolutionReason,
  applyBattleResult,
  resolveTimedOutBattle,
  sweepTimedOutBattles
}
