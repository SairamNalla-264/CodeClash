const express = require('express')
const cors = require('cors')
require('dotenv').config()

const connectDB = require('./config/db')

connectDB()
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
})

// ✅ SOCKET LOGIC
io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    socket.on('join_battle', (battleId) => {
        socket.join(battleId)
        console.log(`Socket ${socket.id} joined battle ${battleId}`)
    })

    socket.on('send_progress', (data) => {
        // data: { battleId, userId, progress, code }
        socket.to(data.battleId).emit('receive_progress', data)
    })

    socket.on('battle_solved', (data) => {
        // data: { battleId, userId }
        io.to(data.battleId).emit('battle_finished', data)
    })

    socket.on('disconnect', () => {
        console.log('User disconnected')
    })
})

app.use(cors())
app.use(express.json())

// ROUTES
app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/users', require('./routes/userRoutes'))
app.use('/api/admin', require('./routes/adminRoutes'))
app.use('/api/admin/problems', require('./routes/adminProblemRoutes'))
app.use('/api/problems', require('./routes/problemRoutes'))
app.use('/api/judge', require('./routes/judgeRoutes'))
app.use('/api/submissions', require('./routes/submissionRoutes'))
app.use('/api/battles', require('./routes/battleRoutes')(io))

const PORT = process.env.PORT || 5000
server.listen(PORT, () => console.log(`Server + Socket running on port ${PORT}`))
