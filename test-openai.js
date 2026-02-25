const https = require('https');

const API_KEY = "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";

const data = JSON.stringify({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: "Say hello" }],
    max_tokens: 5
});

const options = {
    hostname: 'api.openai.com',
    port: 443,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': data.length
    }
};

console.log("Testing connection to OpenAI via native https...");

const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    let responseBody = '';

    res.on('data', (d) => {
        responseBody += d;
    });

    res.on('end', () => {
        try {
            const parsed = JSON.parse(responseBody);
            if (res.statusCode === 200) {
                console.log("Success! Response:", parsed.choices[0].message.content);
            } else {
                console.error("OpenAI error:", parsed.error?.message || responseBody);
            }
        } catch (e) {
            console.error("Failed to parse response:", responseBody);
        }
    });
});

req.on('error', (error) => {
    console.error("Connection error:", error.message);
});

req.write(data);
req.end();
