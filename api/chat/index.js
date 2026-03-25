module.exports = async function (context, req) {
    // This grabs your secret key securely from the Azure vault
    const apiKey = process.env.GEMINI_API_KEY; 
    
    const userMessage = req.body.message;
    const systemPrompt = req.body.systemPrompt;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userMessage }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] }
            })
        });
        
        const data = await response.json();
        
        context.res = {
            status: 200,
            body: { text: data.candidates[0].content.parts[0].text }
        };
    } catch (error) {
        context.res = {
            status: 500,
            body: { error: "Failed to connect to the AI model." }
        };
    }
};
