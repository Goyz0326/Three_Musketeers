const http = require('http');
const https = require('https');
const fs = require('fs');
const querystring = require('querystring');

const PORT = process.env.PORT || 3000;

// --- PASTE YOUR SUPABASE DETAILS HERE ---
const SUPABASE_URL = 'ndjaicmrozhhqinpxhrq.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kamFpY21yb3poaHFpbnB4aHJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MDI0NjksImV4cCI6MjA4NzQ3ODQ2OX0.SvHivQJHjHMHfNBHBigRu7D6JsaLjDmpISWG1l0Ac6w';

// Helper function to talk to Supabase
function supabaseRequest(path, method, data, callback) {
    const body = JSON.stringify(data);
    const options = {
        hostname: SUPABASE_URL,
        path: path,
        method: method,
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    };

    const req = https.request(options, (res) => {
        let resBody = '';
        res.on('data', chunk => resBody += chunk);
        res.on('end', () => callback(JSON.parse(resBody || '[]')));
    });
    if (data) req.write(body);
    req.end();
}

const server = http.createServer((req, res) => {
    if (req.method === 'GET') {
        let file = req.url === '/' ? './index.html' : `.${req.url}`;
        fs.readFile(file, (err, data) => {
            if (err) { res.writeHead(404); res.end("Not Found"); }
            else { res.writeHead(200, {'Content-Type': 'text/html'}); res.end(data); }
        });
    }

    if (req.method === 'POST' && req.url === '/register') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const userData = querystring.parse(body);
            // Save to Supabase
            supabaseRequest('/rest/v1/users', 'POST', userData, () => {
                res.writeHead(302, { 'Location': '/index.html' });
                res.end();
            });
        });
    }

    if (req.method === 'POST' && req.url === '/login') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const { username, password } = querystring.parse(body);
            // Check Supabase for user
            supabaseRequest(`/rest/v1/users?username=eq.${username}&password=eq.${password}`, 'GET', null, (user) => {
                if (user.length > 0) {
                    res.writeHead(302, { 'Location': '/dashboard.html' });
                    res.end();
                } else {
                    res.end("Invalid Login. <a href='/'>Try again</a>");
                }
            });
        });
    }
});

server.listen(PORT, () => console.log(`Server live on ${PORT}`));