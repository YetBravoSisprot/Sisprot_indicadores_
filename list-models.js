const https = require('https');

const API_KEY = "AIzaSyAmxds07Vc5c-Xj9bSO_SM8nv-mp2S8o14";

const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: '/v1beta/models?key=' + API_KEY,
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        const models = JSON.parse(data).models;
        if (models) {
            console.log(models.filter(m => m.name.includes('flash')).map(m => m.name));
        } else {
            console.log(data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});
req.end();
