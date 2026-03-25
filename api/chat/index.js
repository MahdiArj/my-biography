const https = require('https');

module.exports = async function (context, req) {
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Check if key exists in Azure Vault
    if (!apiKey) {
        context.res = { status: 500, body: { error: "Missing GEMINI_API_KEY in Azure Vault." } };
        return;
    }

    const userMessage = req.body.message || "";
    const systemPrompt = req.body.systemPrompt || "";
    context.log(`🚨 NEW AI QUESTION: "${userMessage}"`);

    // 2. Prepare the data to send to Google
    const postData = JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
    });

    // 3. Set up the classic HTTPS connection
    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    // 4. Send the request
    return new Promise((resolve) => {
        const request = https.request(options, (response) => {
            let data = '';

            // Gather the response piece by piece
            response.on('data', (chunk) => {
                data += chunk;
            });

            // When the response is finished
            response.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    
                    if (parsedData.error) {
                        context.res = { status: 500, body: { error: `Google API Error: ${parsedData.error.message}` } };
                    } else if (parsedData.candidates && parsedData.candidates[0]) {
                        context.res = { status: 200, body: { text: parsedData.candidates[0].content.parts[0].text } };
                    } else {
                        context.res = { status: 500, body: { error: "Unexpected response from Google." } };
                    }
                    resolve();
                } catch (e) {
                    context.res = { status: 500, body: { error: "Failed to read Google's response." } };
                    resolve();
                }
            });
        });

        // Catch any connection drops
        request.on('error', (e) => {
            context.res = { status: 500, body: { error: `Server Connection Failed: ${e.message}` } };
            resolve();
        });

        // Fire off the package
        request.write(postData);
        request.end();
    });
};
