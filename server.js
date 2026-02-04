require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = 3000;

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Setup Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Helper function to extract data
async function extractInvoiceData(imagePath) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const imageFile = fs.readFileSync(imagePath);
    const imageBase64 = imageFile.toString('base64');

    const prompt = `
      You are an API that extracts structured data from invoices.
      Analyze this image and return ONLY a raw JSON object. 
      Do NOT include markdown formatting like \`\`\`json or \`\`\`.
      Just the pure JSON string.
      
      Extract these fields:
      - vendor_name (string)
      - invoice_date (string, YYYY-MM-DD)
      - total_amount (number)
      - currency (string)
      - items (array of objects with 'description' and 'amount')
      
      If values are missing, use null.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    let text = response.text();
    
    // Clean up Markdown if present
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(text);

  } catch (error) {
    console.error("AI Error:", error);
    throw new Error("Failed to analyze invoice");
  }
}

// POST endpoint
app.post('/api/analyze', upload.single('invoice'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No invoice image provided' });
  }

  console.log(`Received file: ${req.file.originalname}`);

  try {
    const data = await extractInvoiceData(req.file.path);
    
    // Cleanup: Delete the temp file
    fs.unlinkSync(req.file.path);
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🧾 Invoice Reader API listening at http://localhost:${port}`);
});
