require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

// 1. Setup API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function extractInvoiceData(imagePath) {
  try {
    // 2. Load Model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // 3. Read Image File
    const imageFile = fs.readFileSync(imagePath);
    const imageBase64 = imageFile.toString('base64');

    // 4. Construct Prompt
    const prompt = `
      You are an API that extracts structured data from invoices.
      Analyze this image and return ONLY a JSON object. Do not include markdown formatting like \`\`\`json.
      
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
    const text = response.text();
    
    // 5. Output Result
    console.log("--- Extracted Data ---");
    console.log(text);
    return text;

  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Run (Assuming file is named 'invoice.jpg')
extractInvoiceData('invoice.jpg');
