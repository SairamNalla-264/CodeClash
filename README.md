# ⚔️ CodeClash

**CodeClash** is a competitive coding platform that blends the challenge of LeetCode with the thrill of real-time multiplayer battles. Solve algorithmic problems, climb the Elo-based leaderboard, and get personalized recommendations powered by ML filtering.

---

## ✨ Key Features

### 🎮 Gameplay & Social
- **Real-Time Coding Battles**: Compete 1v1 in live "Battle Rooms" with real-time code and progress syncing via Socket.io.
- **Dynamic Matchmaking**: Find opponents within your skill level using an Elo-aware matchmaking system (+/- 200 Elo range).
- **Leaderboard**: Compete for the top spot on the global leaderboard.
- **User Profiles**: Track your progress with interactive Elo charts, battle history, and achievement stats.

### 🤖 Machine Learning & Intelligence
- **Elo Rating System**: Professional-grade ranking system that adjusts based on opponent difficulty.
- **Content-Based Filtering**: Suggests new problems based on the topics and difficulties you’ve already mastered.
- **Collaborative Filtering**: Recommends "trending" problems among users with similar solving patterns using Jaccard Similarity.

### 💻 Developer Experience
- **Monaco Editor Support**: A premium LeetCode-style editing experience with syntax highlighting.
- **Multi-Language Support**: Solve problems in **JavaScript**, **Python**, **Java**, or **C++**.
- **Integrated Judge**: Remote code execution powered by the Judge0 API.

---

## 🛠️ Tech Stack

- **Frontend**: React, Monaco Editor, Socket.io-client, React Markdown.
- **Backend**: Node.js, Express, MongoDB, Mongoose, Socket.io.
- **Authentication**: JWT (JSON Web Tokens), Google OAuth (Sign-In).
- **Compiler/Judge**: Judge0 CE via RapidAPI.

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/codeclash.git
cd codeclash
```

### 2️⃣ Backend Setup
```bash
cd codeclash-backend
npm install
```
Create a `.env` file in the `codeclash-backend` directory:
```env
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
GOOGLE_CLIENT_ID=your_google_id
JUDGE0_KEY=your_rapidapi_key
```
Seed the initial problems:
```bash
node scripts/seedTwoSum.js
node scripts/seedPalindromeNumber.js
```
Start the server:
```bash
npm start
```

### 3️⃣ Frontend Setup
```bash
cd ../codeclash-frontend
npm install
npm run dev
```

---

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.

---

## 🤝 Contributing
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
