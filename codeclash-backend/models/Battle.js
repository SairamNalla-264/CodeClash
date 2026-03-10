const mongoose = require('mongoose')

const battleSchema = new mongoose.Schema({
    players: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            code: {
                type: String,
                default: ''
            },
            progress: {
                type: Number,
                default: 0 // percentage of test cases passed (optional)
            },
            status: {
                type: String,
                enum: ['coding', 'submitted', 'solved'],
                default: 'coding'
            },
            eloChange: {
                type: Number,
                default: 0
            }
        }
    ],
    problem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Problem',
        required: true
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        required: true
    },
    status: {
        type: String,
        enum: ['waiting', 'active', 'completed'],
        default: 'waiting'
    },
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    startTime: {
        type: Date
    },
    endTime: {
        type: Date
    }
}, { timestamps: true })

module.exports = mongoose.model('Battle', battleSchema)
