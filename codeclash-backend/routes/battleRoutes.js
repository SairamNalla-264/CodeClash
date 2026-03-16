module.exports = (io) => {
    const express = require('express')
    const router = express.Router()
    const authMiddleware = require('../middleware/authMiddleware')
    const Battle = require('../models/Battle')
    const Problem = require('../models/Problem')
    const User = require('../models/User')
    const {
        BATTLE_DURATIONS,
        isParticipant,
        getRemainingSeconds,
        getResolutionReason,
        applyBattleResult,
        resolveTimedOutBattle
    } = require('../utils/battleResolution')

    router.post('/match', authMiddleware, async (req, res) => {
        try {
            const { difficulty } = req.body
            if (!difficulty) return res.status(400).json({ message: 'Difficulty required' })

            const currentUser = await User.findById(req.user.id)
            if (!currentUser) return res.status(404).json({ message: 'User not found' })

            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
            let battle = await Battle.findOne({
                status: 'waiting',
                difficulty,
                'players.user': { $ne: req.user.id },
                createdAt: { $gte: fiveMinutesAgo }
            }).sort({ createdAt: 1 }).populate('players.user', 'elo')

            if (battle) {
                const opponentElo = battle.players[0].user.elo
                const isWithinRange = Math.abs(opponentElo - currentUser.elo) <= 200
                if (!isWithinRange) battle = null
            }

            if (battle) {
                const activatedBattle = await Battle.findOneAndUpdate(
                    { _id: battle._id, status: 'waiting' },
                    {
                        $push: { players: { user: req.user.id } },
                        $set: { status: 'active', startTime: new Date() }
                    },
                    { new: true }
                )
                    .populate('players.user', 'username elo')
                    .populate('problem')

                if (!activatedBattle) {
                    return res.status(409).json({ message: 'Battle was already matched. Please retry.' })
                }

                console.log(`Match Found, emitting to room: ${activatedBattle._id.toString()}`)
                io.to(activatedBattle._id.toString()).emit('match_found', activatedBattle.toObject())
                return res.json(activatedBattle)
            }

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
        } catch (err) {
            res.status(500).json({ message: 'Matchmaking failed', error: err.message })
        }
    })

    router.post('/cancel', authMiddleware, async (req, res) => {
        try {
            const cancelled = await Battle.updateMany(
                {
                    status: 'waiting',
                    'players.user': req.user.id,
                    $expr: { $eq: [{ $size: '$players' }, 1] }
                },
                { $set: { status: 'cancelled' } }
            )
            console.log(`Cancelled ${cancelled.modifiedCount} waiting battle(s) for user ${req.user.id}`)
            res.json({ message: 'Matchmaking cancelled', count: cancelled.modifiedCount })
        } catch (err) {
            res.status(500).json({ message: 'Cancel failed', error: err.message })
        }
    })

    router.get('/:id', authMiddleware, async (req, res) => {
        try {
            const battle = await Battle.findById(req.params.id)
                .populate('players.user', 'username elo')
                .populate('problem')

            if (!battle) return res.status(404).json({ message: 'Battle not found' })
            if (req.user.role !== 'admin' && !isParticipant(battle, req.user.id)) {
                return res.status(403).json({ message: 'Not authorized to view this battle' })
            }

            await resolveTimedOutBattle(battle, io)
            const payload = battle.toObject()
            payload.remainingSeconds = battle.status === 'active'
                ? getRemainingSeconds(battle)
                : 0
            payload.resolutionReason = getResolutionReason(battle)

            res.json(payload)
        } catch {
            res.status(400).json({ message: 'Invalid Battle ID' })
        }
    })

    router.post('/:id/sync', authMiddleware, async (req, res) => {
        try {
            const { code, progress, status } = req.body
            const battle = await Battle.findById(req.params.id)
            if (!battle) return res.status(404).json({ message: 'Battle not found' })

            const playerIndex = battle.players.findIndex((player) => player.user.toString() === req.user.id)
            if (playerIndex === -1) return res.status(403).json({ message: 'Not a participant' })

            await resolveTimedOutBattle(battle, io)
            if (battle.status !== 'active') {
                return res.status(409).json({ message: 'Battle is no longer active' })
            }

            if (code !== undefined) battle.players[playerIndex].code = code
            if (progress !== undefined) battle.players[playerIndex].progress = progress

            if (status !== undefined) {
                battle.players[playerIndex].status = status

                if (status === 'solved' && battle.status === 'active') {
                    await applyBattleResult(battle, req.user.id)
                    io.to(battle._id.toString()).emit('battle_finished', {
                        battleId: battle._id.toString(),
                        userId: req.user.id,
                        reason: 'solved'
                    })
                } else {
                    await battle.save()
                }
            } else {
                await battle.save()
            }

            res.json(battle)
        } catch (err) {
            res.status(500).json({ message: 'Sync failed', error: err.message })
        }
    })

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
