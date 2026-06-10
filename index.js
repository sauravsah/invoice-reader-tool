const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');
const path = require('path');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Serve static files
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Analyze Invoice Endpoint
app.post('/analyze', upload.single('invoice'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No invoice image provided'
            });
        }

        // Convert uploaded image to Base64
        const imageBase64 = req.file.buffer.toString('base64');

        const prompt = `
You are an API that extracts structured data from invoices.

Analyze this invoice image and return ONLY a valid JSON object.

DO NOT include:
- Markdown
- Explanations
- Code blocks
- Extra text

Return JSON in exactly this format:

{
  "vendor_name": "string",
  "invoice_date": "YYYY-MM-DD",
  "total_amount": number,
  "currency": "string",
  "items": [
    {
      "description": "string",
      "amount": number
    }
  ]
}

If a value is missing, return null.
`;

        const response = await openai.responses.create({
            model: "gpt-4.1-mini",
            input: [
                {
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text: prompt
                        },
                        {
                            type: "input_image",
                            image_url: `data:${req.file.mimetype};base64,${imageBase64}`
                        }
                    ]
                }
            ]
        });

        const text = response.output_text;

        // Remove markdown if model accidentally adds it
        const cleanText = text
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

        const invoiceData = JSON.parse(cleanText);

        res.json(invoiceData);

    } catch (error) {
        console.error('OpenAI Error:', error);

        res.status(500).json({
            error: error.message
        });
    }
});

if (require.main === module) {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;