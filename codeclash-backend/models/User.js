const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  solvedProblems: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem'
    }
  ],
  elo: {
    type: Number,
    default: 1200
  },
  streak: { type: Number, default: 0 },
  solved: { type: Number, default: 0 },
  lastSolvedDate: { type: String, default: "" },


  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }


}, { timestamps: true })

module.exports = mongoose.model('User', userSchema)
