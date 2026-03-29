const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Secret Key
const SECRET_KEY = "mysecretkey";

// Dummy Database
let users = [];
let refreshTokens = [];

// ===============================
// 1. Register User
// ===============================
app.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body;

        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = {
            id: users.length + 1,
            username,
            password: hashedPassword
        };

        users.push(user);

        res.json({ message: "User registered successfully" });

    } catch (error) {
        res.status(500).json({ message: "Error registering user" });
    }
});

// ===============================
// 2. Login User + Generate JWT
// ===============================
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = users.find(u => u.username === username);
        if (!user) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const accessToken = jwt.sign(
            { id: user.id, username: user.username },
            SECRET_KEY,
            { expiresIn: "15m" }
        );

        const refreshToken = jwt.sign(
            { id: user.id },
            SECRET_KEY,
            { expiresIn: "7d" }
        );

        refreshTokens.push(refreshToken);

        res.json({ accessToken, refreshToken });

    } catch (error) {
        res.status(500).json({ message: "Login error" });
    }
});

// ===============================
// 3. Middleware (Verify Token)
// ===============================
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader) return res.sendStatus(401);

    const token = authHeader.split(" ")[1]; // Bearer TOKEN

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);

        req.user = user;
        next();
    });
}

// ===============================
// 4. Protected Banking Route
// ===============================
app.get("/account", authenticateToken, (req, res) => {
    res.json({
        message: "Access granted to secure banking data",
        user: req.user,
        balance: 50000
    });
});

// ===============================
// 5. Refresh Token
// ===============================
app.post("/token", (req, res) => {
    const { token } = req.body;

    if (!token) return res.sendStatus(401);
    if (!refreshTokens.includes(token)) return res.sendStatus(403);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);

        const accessToken = jwt.sign(
            { id: user.id },
            SECRET_KEY,
            { expiresIn: "15m" }
        );

        res.json({ accessToken });
    });
});

// ===============================
// 6. Logout (Remove Refresh Token)
// ===============================
app.post("/logout", (req, res) => {
    const { token } = req.body;

    refreshTokens = refreshTokens.filter(t => t !== token);

    res.json({ message: "Logged out successfully" });
});

// ===============================
// 7. Start Server
// ===============================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});