const http = require('http');
const https = require('https');
const fs = require('fs');
const querystring = require('querystring');

const PORT = process.env.PORT || 10000; 
const SUPABASE_URL = 'ndjaicmrozhhqinpxhrq.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kamFpY21yb3poaHFpbnB4aHJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MDI0NjksImV4cCI6MjA4NzQ3ODQ2OX0.SvHivQJHjHMHfNBHBigRu7D6JsaLjDmpISWG1l0Ac6w';

// Helper to turn the cookie string into an easy-to-use object
function parseCookies(cookieHeader) {
    const list = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach(cookie => {
        let [name, ...rest] = cookie.split('=');
        name = name.trim();
        if (!name) return;
        const value = rest.join('=').trim();
        if (!value) return;
        list[name] = decodeURIComponent(value);
    });
    return list;
}

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
                        const loggedInUser = users[0]; // This is the user object from Supabase
                        const userId = loggedInUser.id; // Get the specific ID

                        // SUCCESS: Send a cookie containing the specific User ID
                        res.writeHead(200, {
                            'Set-Cookie': [
                                `isLoggedIn=true; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600`,
                                `userId=${userId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600`
                            ]
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
        // We send an array to clear both the login flag AND the user ID
        res.writeHead(200, {
            'Set-Cookie': [
                'isLoggedIn=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict',
                'userId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict'
            ]
        });
        res.end();
        return;
    }

    //5. Send Data to Database to add robot
    if (req.method === 'POST' && req.url === '/add-robot') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const robotData = querystring.parse(body);
            
            // 1. Get the userId from the cookies
            const cookies = parseCookies(req.headers.cookie);
            const currentUserId = cookies.userId;

            if (!currentUserId) {
                res.writeHead(401);
                res.end("Unauthorized: Please log in again.");
                return;
            }

            // 2. Prepare the data for Supabase
            const payload = JSON.stringify({
                robot_name: robotData.robot_name,
                robot_address: robotData.robot_address,
                user_id: currentUserId // This links the robot to the logged-in user!
            });

            const options = {
                hostname: SUPABASE_URL,
                path: '/rest/v1/robots',
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                }
            };

            const dbReq = https.request(options, (dbRes) => {
                dbRes.on('end', () => {
                    if (dbRes.statusCode >= 200 && dbRes.statusCode < 300) {
                        res.writeHead(200);
                        res.end("Success");
                    } else {
                        console.error("Supabase Error:", dbRes.statusCode);
                        res.writeHead(400);
                        res.end("Database Error");
                    }
                });
            });

            dbReq.on('error', (e) => {
                res.writeHead(500);
                res.end("Server Error");
            });

            dbReq.write(payload);
            dbReq.end();
        });
        return;
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Study Robot Server running on port ${PORT}`);
});