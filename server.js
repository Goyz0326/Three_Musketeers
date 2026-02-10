const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'users.json');

// --- Helper Functions to handle the "Database" ---

function loadUsers() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error("Error loading users:", err);
    }
    return []; // Return empty array if file doesn't exist or is corrupted
}

function saveUsers(users) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
    } catch (err) {
        console.error("Error saving users:", err);
    }
}

// Initialize the users array from the file
let users = loadUsers();

const server = http.createServer((req, res) => {
    const { method, url } = req;

    // 1. Serve HTML Files
    if (method === 'GET') {
        let filePath = '';
        if (url === '/' || url === '/index.html') filePath = './index.html';
        else if (url === '/register.html') filePath = './register.html';
        else if (url === '/dashboard.html') filePath = './dashboard.html';

        if (filePath) {
            fs.readFile(filePath, (err, content) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Error loading page');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(content);
                }
            });
            return;
        }
    }

    // 2. Registration Logic (Saves to File)
    if (method === 'POST' && url === '/register') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const { username, password } = querystring.parse(body);
            
            if (users.find(u => u.username === username)) {
                res.end('User exists! <a href="/register.html">Try again</a>');
            } else {
                users.push({ username, password });
                saveUsers(users); // PERSIST THE DATA
                console.log(`Saved user ${username} to disk.`);
                res.writeHead(302, { 'Location': '/index.html' });
                res.end();
            }
        });
        return;
    }

    // 3. Login Logic
    if (method === 'POST' && url === '/login') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const { username, password } = querystring.parse(body);
            const user = users.find(u => u.username === username && u.password === password);
            if (user) {
                res.writeHead(302, { 'Location': '/dashboard.html' });
                res.end();
            } else {
                res.end('Invalid login. <a href="/index.html">Back</a>');
            }
        });
        return;
    }
});

server.listen(PORT, () => {
    console.log(`Server live on port ${PORT}`);
});