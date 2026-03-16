const express = require('express')
const cors = require('cors')
require('dotenv').config()

const connectDB = require('./config/db')

connectDB()

const http = require('http')
const { Server } = require('socket.io')
const { sweepTimedOutBattles } = require('./utils/battleResolution')

const app = express()
const server = http.createServer(app)

const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}

const io = new Server(server, {
  cors: corsOptions
})

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join_battle', (battleId) => {
    socket.join(battleId)
    console.log(`Socket ${socket.id} joined battle ${battleId}`)
  })

  socket.on('leave_battle', (battleId) => {
    socket.leave(battleId)
    console.log(`Socket ${socket.id} left battle ${battleId}`)
  })

  socket.on('send_progress', (data) => {
    socket.to(data.battleId).emit('receive_progress', data)
  })

  socket.on('battle_solved', (data) => {
    io.to(data.battleId).emit('battle_finished', data)
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

app.use(cors(corsOptions))
app.use(express.json())

app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/users', require('./routes/userRoutes'))
app.use('/api/admin', require('./routes/adminRoutes'))
app.use('/api/admin/problems', require('./routes/adminProblemRoutes'))
app.use('/api/problems', require('./routes/problemRoutes'))
app.use('/api/judge', require('./routes/judgeRoutes'))
app.use('/api/submissions', require('./routes/submissionRoutes'))
app.use('/api/battles', require('./routes/battleRoutes')(io))

setInterval(() => {
  sweepTimedOutBattles(io).catch((err) => {
    console.error('Battle timeout sweep failed:', err.message)
  })
}, 5000)

const PORT = process.env.PORT || 5000
server.listen(PORT, () => console.log(`Server + Socket running on port ${PORT}`))
