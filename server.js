require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3000;

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// OpenAI Setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to extract data
async function extractInvoiceData(imagePath) {
  try {
    const imageFile = fs.readFileSync(imagePath);
    const imageBase64 = imageFile.toString('base64');

    const prompt = `
You are an API that extracts structured data from invoices.

Analyze this image and return ONLY a valid JSON object.

Extract:
- vendor_name (string)
- invoice_date (YYYY-MM-DD)
- total_amount (number)
- currency (string)
- items (array of objects with description and amount)

If a value is missing, return null.

Return ONLY JSON.
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
              image_url: `data:image/jpeg;base64,${imageBase64}`
            }
          ]
        }
      ]
    });

    let text = response.output_text;

    text = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    return JSON.parse(text);

  } catch (error) {
    console.error("OpenAI Error:", error);
    throw new Error("Failed to analyze invoice");
  }
}

// POST endpoint
app.post('/api/analyze', upload.single('invoice'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'No invoice image provided'
    });
  }

  try {
    const data = await extractInvoiceData(req.file.path);

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`🧾 Invoice Reader API listening on port ${port}`);
});