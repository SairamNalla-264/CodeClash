const mongoose = require('mongoose')

/* ==============================
   Example Schema (Shown to user)
================================ */
const exampleSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      required: true
    },
    output: {
      type: String,
      required: true
    },
    explanation: {
      type: String
    }
  },
  { _id: false }
)

/* ==============================
   Test Case Schema (Judge use)
================================ */
const testCaseSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      required: true
    },
    output: {
      type: String,
      required: true
    }
  },
  { _id: false }
)

/* ==============================
   Main Problem Schema
================================ */
const problemSchema = new mongoose.Schema(
  {
    /* 1️⃣ Basic Info */
    title: {
      type: String,
      required: true,
      trim: true
    },

    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true
    },

    /* 2️⃣ Metadata */
    topics: {
      type: [String],
      default: []
    },

    companies: {
      type: [String],
      default: []
    },

    /* 3️⃣ Problem Content */
    description: {
      type: String,
      required: true
    },

    examples: {
      type: [exampleSchema],
      required: true
    },

    constraints: {
      type: [String],
      required: true
    },

    /* 4️⃣ Judge Test Cases */
    visibleTestCases: {
      type: [testCaseSchema],
      default: [] // Used for RUN
    },

    hiddenTestCases: {
      type: [testCaseSchema],
      required: true // Used for SUBMIT
    },

    /* 4.5️⃣ Code Templates */
    starterCode: {
      type: Map, // e.g., { "javascript": "...", "python": "..." }
      of: String,
      default: {}
    },

    driverCode: {
      type: Map, // Code to append that calls the user function with stdin inputs
      of: String,
      default: {}
    },

    /* 5️⃣ Admin Info */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    /* 6️⃣ Stats (future use) */
    submissions: {
      type: Number,
      default: 0
    },

    accepted: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model('Problem', problemSchema)
