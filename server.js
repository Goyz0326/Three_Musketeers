const http = require('http');
const https = require('https');
const fs = require('fs');
const querystring = require('querystring');

const PORT = process.env.PORT || 10000; 
const SUPABASE_URL = 'ndjaicmrozhhqinpxhrq.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kamFpY21yb3poaHFpbnB4aHJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MDI0NjksImV4cCI6MjA4NzQ3ODQ2OX0.SvHivQJHjHMHfNBHBigRu7D6JsaLjDmpISWG1l0Ac6w';

const server = http.createServer((req, res) => {
    // 1. Serve your HTML files
    if (req.method === 'GET') {
    let file = req.url === '/' ? './index.html' : `.${req.url}`;

    // CHECK: Is the user trying to reach the dashboard?
    if (file === './dashboard.html') {
        const cookies = req.headers.cookie || "";
        if (!cookies.includes("isLoggedIn=true")) {
            // No wristband! Redirect them back to login.
            res.writeHead(302, { 'Location': '/index.html' });
            res.end();
            return;
        }
    }

    fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end("File Not Found"); }
        else { res.writeHead(200, {'Content-Type': 'text/html'}); res.end(data); }
    });
    return;
}

    // 2. Handle Registration
    if (req.method === 'POST' && req.url === '/register') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const userData = querystring.parse(body);
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
                dbRes.on('data', () => {}); 
                dbRes.on('end', () => {
                    // Step D: Check if Supabase liked the data
                    if (dbRes.statusCode >= 200 && dbRes.statusCode < 300) {
                        res.writeHead(200); // Success status code
                        res.end();
                    } else {
                        res.writeHead(400); // Error status code
                        res.end();
                    }
                });
            });

            dbReq.on('error', (e) => {
                console.error(e);
                res.writeHead(500); // Server error status code
                res.end();
            });

            dbReq.write(JSON.stringify(userData));
            dbReq.end();
        });
        return;
    }

    // 3. Handle Login
    if (req.method === 'POST' && req.url === '/login') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const userData = querystring.parse(body);
            // Construct the query to find the user
            const path = `/rest/v1/users?username=eq.${userData.username}&password=eq.${userData.password}`;
            
            const options = {
                hostname: SUPABASE_URL,
                path: path,
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            };

            const dbReq = https.request(options, (dbRes) => {
                let resData = '';
                dbRes.on('data', d => { resData += d; });
                dbRes.on('end', () => {
                    const users = JSON.parse(resData || '[]');
                    if (users.length > 0) {
                        // SUCCESS: Found the user. 
                        // We send a "Set-Cookie" header so the browser remembers them.
                        res.writeHead(200, {
                            'Set-Cookie': `isLoggedIn=true; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600`
                        }); 
                        res.end();
                    } else {
                        res.writeHead(401); 
                        res.end();
                    }
                });
            });
            dbReq.on('error', (e) => {
                res.writeHead(500);
                res.end("Internal Server Error");
            });
            dbReq.end();
        });
        return;
    }

    //4. Handle Logout
    if (req.method === 'POST' && req.url === '/logout') {
        // We overwrite the cookie with an expired date to delete it
        res.writeHead(200, {
            'Set-Cookie': 'isLoggedIn=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly'
        });
        res.end();
        return;
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Study Robot Server running on port ${PORT}`);
});