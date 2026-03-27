const express = require('express');
const jwt = require('jsonwebtoken');

const logger = require('./middleware/logger');
const auth = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const SECRET = "secretkey";

app.use(express.json());
app.use(logger);

// Public route
app.get('/', (req, res) => {
    res.send("Public Route Working");
});

// Login route
app.get('/login', (req, res) => {
    const user = { id: 1, name: "Tanisha" };
    const token = jwt.sign(user, SECRET, { expiresIn: "1h" });
    res.json({ token });
});

// Protected route
app.get('/protected', auth, (req, res) => {
    res.json({
        message: "Protected Route Accessed",
        user: req.user
    });
});

// Error middleware (last)
app.use(errorHandler);

app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});