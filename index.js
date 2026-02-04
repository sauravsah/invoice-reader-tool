const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const path = require('path');
const upload = multer({ storage: multer.memoryStorage() }); // Store files in memory

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Serve static files from 'public' folder
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/analyze', upload.single('invoice'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No invoice image provided' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Convert buffer to base64
        const imageBase64 = req.file.buffer.toString('base64');

        const prompt = `
          You are an API that extracts structured data from invoices.
          Analyze this image and return ONLY a JSON object. Do not include markdown formatting.
          
          Extract:
          - vendor_name
          - invoice_date (YYYY-MM-DD)
          - total_amount
          - currency
          - items (array: description, amount)
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imageBase64,
                    mimeType: req.file.mimetype,
                },
            },
        ]);

        const response = await result.response;
        const text = response.text();
        
        // Clean up markdown code blocks if present
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        res.json(JSON.parse(cleanText));

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app; // Export for Vercel
