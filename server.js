const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const mdns = require('mdns-js');

const app = express();
const db = new sqlite3.Database('./users.db');

// Initialize Database
db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)");

app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'study-bot-secret', resave: false, saveUninitialized: true }));

// --- Routes ---

// Register
app.post('/register', async (req, { username, password }, res) => {
    const hashed = await bcrypt.hash(password, 10);
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashed]);
    res.send("Registered! <a href='/login'>Login here</a>");
});

// Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user.id;
            res.redirect('/dashboard');
        } else {
            res.send("Invalid credentials.");
        }
    });
});

// --- Robot Discovery ---
app.get('/find-robot', (req, res) => {
    if (!req.session.userId) return res.status(401).send("Log in first");

    const browser = mdns.createBrowser(mdns.tcp('http'));
    let foundRobot = null;

    browser.on('ready', () => browser.discover());
    browser.on('update', (data) => {
        // Look for your ESP32's specific mDNS name
        if (data.host === 'studyrobot.local') {
            foundRobot = data.addresses[0];
            browser.stop();
            res.json({ status: 'found', ip: foundRobot });
        }
    });

    // Timeout after 5 seconds if not found
    setTimeout(() => { if(!foundRobot) res.json({ status: 'not_found' }); }, 5000);
});

app.listen(3000, () => console.log("Server running on port 3000"));