const http = require('http');
const https = require('https');
const fs = require('fs');
const querystring = require('querystring');

const PORT = process.env.PORT || 10000; // Required for Render
const SUPABASE_URL = 'ndjaicmrozhhqinpxhrq.supabase.co'; // No https://
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kamFpY21yb3poaHFpbnB4aHJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MDI0NjksImV4cCI6MjA4NzQ3ODQ2OX0.SvHivQJHjHMHfNBHBigRu7D6JsaLjDmpISWG1l0Ac6w';

const server = http.createServer((req, res) => {
    // 1. Serve your HTML files
    if (req.method === 'GET') {
        let file = req.url === '/' ? './index.html' : `.${req.url}`;
        fs.readFile(file, (err, data) => {
            if (err) { res.writeHead(404); res.end("File Not Found"); }
            else { res.writeHead(200, {'Content-Type': 'text/html'}); res.end(data); }
        });
        return;
    }

    // 2. Handle Registration (The "PHP" part)
    if (req.method === 'POST' && req.url === '/register') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const userData = querystring.parse(body);
            
            // Send to Supabase
            const options = {
                hostname: SUPABASE_URL,
                path: '/rest/v1/users',
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                }
            };

            const dbReq = https.request(options, (dbRes) => {
                if (dbRes.statusCode >= 200 && dbRes.statusCode < 300) {
                    res.writeHead(302, { 'Location': '/index.html' }); // Success!
                    res.end();
                } else {
                    res.end("Database Error. Check Render Logs.");
                }
            });
            dbReq.write(JSON.stringify(userData));
            dbReq.end();
        });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Study Robot Server running on port ${PORT}`);
});