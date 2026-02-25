const fetch = require('node-fetch') || globalThis.fetch;

const API_KEY = "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";

const payloads = {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Say hello" }],
        max_tokens: 5
    })
};

const proxiesToTest = [
    "https://api.openai-proxy.org/v1/chat/completions",
    "https://corsproxy.io/?https://api.openai.com/v1/chat/completions",
    "https://api.pawan.krd/v1/chat/completions" // This one sometimes supports pass-through
];

async function run() {
    for (let proxy of proxiesToTest) {
        console.log(`\nTesting: ${proxy}`);
        try {
            const req = await fetch(proxy, payloads);
            const res = await req.json();
            if (req.ok && res.choices) {
                console.log("✅ SUCCESS:", res.choices[0].message.content);
                break;
            } else {
                console.log("❌ FAILED:", res.error?.message || res);
            }
        } catch (e) {
            console.log("❌ ERROR:", e.message);
        }
    }
}

run();
