const https = require('https');

const API_KEY = "AIzaSyAmxds07Vc5c-Xj9bSO_SM8nv-mp2S8o14";

const payload = JSON.stringify({
    model: "gemini-2.5-flash",
    messages: [{ role: "user", content: "Say hello" }],
    temperature: 0.1
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: '/v1beta/openai/chat/completions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(payload)
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('RESPONSE:', data);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(payload);
req.end();
