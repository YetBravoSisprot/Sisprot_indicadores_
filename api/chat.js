export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Credentials', true)
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
        res.setHeader(
            'Access-Control-Allow-Headers',
            'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
        )
        return res.status(200).end()
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' })
    }

    // Try multiple possible names for the API key in Vercel env
    const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: { message: "API Key not configured in Vercel Environment Variables." } })
    }

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();

        // Vercel serverless requires returning exact status
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Vercel API Route Error:", error);
        res.status(500).json({ error: { message: error.message } });
    }
}
