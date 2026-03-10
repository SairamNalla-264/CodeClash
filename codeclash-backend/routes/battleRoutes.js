module.exports = (io) => {
    const express = require('express')
    const router = express.Router()
    const authMiddleware = require('../middleware/authMiddleware')
    const Battle = require('../models/Battle')
    const Problem = require('../models/Problem')
    const User = require('../models/User')
    const { calculateNewRatings } = require('../utils/eloUtils')

    // 🎲 MATCHMAKING: Find or Create a Battle
    router.post('/match', authMiddleware, async (req, res) => {
        try {
            const { difficulty } = req.body
            if (!difficulty) return res.status(400).json({ message: 'Difficulty required' })

            // 1. Get current user's Elo
            const currentUser = await User.findById(req.user.id)
            if (!currentUser) return res.status(404).json({ message: 'User not found' })

            // 1.5 Look for a waiting battle with similar Elo and same difficulty
            let battle = await Battle.findOne({
                status: 'waiting',
                difficulty,
                'players.user': { $ne: req.user.id } // Don't match with self
            }).populate('players.user', 'elo')

            // Filter by Elo range (+/- 200)
            if (battle) {
                const opponentElo = battle.players[0].user.elo
                const isWithinRange = Math.abs(opponentElo - currentUser.elo) <= 200

                if (!isWithinRange) {
                    battle = null // Keep looking or create new if not found
                    // Note: In a real system, we might expand the search range over time
                }
            }

            if (battle) {
                // 2. Join existing battle
                battle.players.push({ user: req.user.id })
                battle.status = 'active'
                battle.startTime = new Date()
                await battle.save()

                // 📢 Notify everyone in the battle room via Socket
                io.to(battle._id.toString()).emit('match_found', battle)

                return res.json(battle)
            } else {
                // 3. Create new waiting battle
                // Pick a random problem of that difficulty
                const problems = await Problem.find({ difficulty })
                if (problems.length === 0) {
                    return res.status(404).json({ message: 'No problems found for this difficulty' })
                }
                const randomProblem = problems[Math.floor(Math.random() * problems.length)]

                battle = new Battle({
                    players: [{ user: req.user.id }],
                    problem: randomProblem._id,
                    difficulty,
                    status: 'waiting'
                })
                await battle.save()
                return res.status(201).json(battle)
            }
        } catch (err) {
            res.status(500).json({ message: 'Matchmaking failed', error: err.message })
        }
    })

    // 📄 GET BATTLE STATUS
    router.get('/:id', authMiddleware, async (req, res) => {
        try {
            const battle = await Battle.findById(req.params.id)
                .populate('players.user', 'username elo')
                .populate('problem')

            if (!battle) return res.status(404).json({ message: 'Battle not found' })
            res.json(battle)
        } catch {
            res.status(400).json({ message: 'Invalid Battle ID' })
        }
    })

    // ✏️ UPDATE PROGRESS / SYNC CODE
    router.post('/:id/sync', authMiddleware, async (req, res) => {
        try {
            const { code, progress, status } = req.body
            const battle = await Battle.findById(req.params.id)
            if (!battle) return res.status(404).json({ message: 'Battle not found' })

            const playerIndex = battle.players.findIndex(p => p.user.toString() === req.user.id)
            if (playerIndex === -1) return res.status(403).json({ message: 'Not a participant' })

            if (code !== undefined) battle.players[playerIndex].code = code
            if (progress !== undefined) battle.players[playerIndex].progress = progress

            if (status !== undefined) {
                battle.players[playerIndex].status = status

                // 🏆 WINNER LOGIC
                if (status === 'solved' && battle.status === 'active') {
                    battle.status = 'completed'
                    battle.winner = req.user.id
                    battle.endTime = new Date()

                    // Update Elo Ratings and Stats
                    const players = await Promise.all(battle.players.map(p => User.findById(p.user)))
                    const winnerIndex = battle.players.findIndex(p => p.user.toString() === req.user.id)
                    const loserIndex = 1 - winnerIndex // Assuming 2 players for now

                    if (players[winnerIndex] && players[loserIndex]) {
                        const winner = players[winnerIndex]
                        const loser = players[loserIndex]

                        const { newRatingA, newRatingB, changeA, changeB } = calculateNewRatings(
                            winner.elo,
                            loser.elo,
                            1 // Winner gets 1 score
                        )

                        // Update Battle Document with Elo changes
                        battle.players[winnerIndex].eloChange = changeA
                        battle.players[loserIndex].eloChange = changeB

                        // Update Winner
                        winner.elo = newRatingA
                        winner.solved += 1
                        winner.streak += 1
                        const probId = battle.problem.toString()
                        if (!winner.solvedProblems.includes(probId)) {
                            winner.solvedProblems.push(probId)
                        }
                        await winner.save()

                        // Update Loser
                        loser.elo = newRatingB
                        loser.streak = 0
                        await loser.save()
                    }
                }
            }

            await battle.save()
            res.json(battle)
        } catch (err) {
            res.status(500).json({ message: 'Sync failed', error: err.message })
        }
    })

    // 🏹 GET RECENT BATTLES FOR USER
    router.get('/history/me', authMiddleware, async (req, res) => {
        try {
            const battles = await Battle.find({
                status: 'completed',
                'players.user': req.user.id
            })
                .populate('players.user', 'username')
                .populate('problem', 'title')
                .sort({ endTime: -1 })
                .limit(10)

            res.json(battles)
        } catch (err) {
            res.status(500).json({ message: 'Failed to fetch battle history' })
        }
    })

    return router
}
