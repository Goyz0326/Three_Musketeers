const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

// Temporary in-memory user storage
const users = []; 

const server = http.createServer((req, res) => {
    const { method, url } = req;

    // 1. Serve HTML Files (GET Requests)
    if (method === 'GET') {
        let filePath = '';
        if (url === '/' || url === '/index.html') filePath = './index.html';
        else if (url === '/register.html') filePath = './register.html';
        else if (url === '/dashboard.html') filePath = './dashboard.html';

        if (filePath) {
            fs.readFile(filePath, (err, content) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Error loading file');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(content);
                }
            });
            return;
        }
    }

    // 2. Handle Registration (POST /register)
    if (method === 'POST' && url === '/register') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const { username, password } = querystring.parse(body);
            if (users.find(u => u.username === username)) {
                res.end('User already exists. <a href="/register.html">Try again</a>');
            } else {
                users.push({ username, password });
                console.log(`Registered: ${username}`);
                res.writeHead(302, { 'Location': '/index.html' });
                res.end();
            }
        });
        return;
    }

    // 3. Handle Login (POST /login)
    if (method === 'POST' && url === '/login') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const { username, password } = querystring.parse(body);
            const user = users.find(u => u.username === username && u.password === password);
            if (user) {
                console.log(`Logged in: ${username}`);
                res.writeHead(302, { 'Location': '/dashboard.html' });
                res.end();
            } else {
                res.end('Invalid credentials. <a href="/index.html">Go back</a>');
            }
        });
        return;
    }

    // Default 404
    res.writeHead(404);
    res.end('Page not found');
});

const PORT = process.env.PORT || 3000; 

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});