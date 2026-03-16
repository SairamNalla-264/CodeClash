const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { OAuth2Client } = require('google-auth-library')
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)


const router = express.Router()

// =====================
// REGISTER
// =====================
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body

  try {
    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await User.create({
      username,
      email,
      password: hashedPassword
    })


    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )


    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        elo: user.elo,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// =====================
// LOGIN  👈 YOUR CODE GOES HERE
// =====================
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  try {
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )


    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        elo: user.elo,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// =====================
// GOOGLE SIGN-IN
// =====================
router.post('/google', async (req, res) => {
  const { credential } = req.body

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    })

    const { name, email, picture, sub } = ticket.getPayload()

    let user = await User.findOne({ email })

    if (!user) {
      // Create new user if not exists
      // Using 'sub' as a base for username if it's unique enough, or name + random
      const username = name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000)

      // Since password is required in schema, we provide a random one
      const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10)

      user = await User.create({
        username,
        email,
        password: randomPassword,
        profilePicture: picture // Note: Check if profilePicture is in schema, if not it's fine
      })
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        elo: user.elo,
        role: user.role
      }
    })

  } catch (error) {
    console.error('Google Auth Error:', error)
    res.status(500).json({ message: 'Google authentication failed' })
  }
})

module.exports = router

