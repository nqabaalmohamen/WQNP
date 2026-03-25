import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from "@google/generative-ai";

const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    if (!event.body) {
      throw new Error("Request body is missing");
    }

    const { prompt, selectedTag } = JSON.parse(event.body);

    if (!prompt || !selectedTag) {
      throw new Error("Missing prompt or selectedTag in request body");
    }

    const GEMINI_KEY = "AIzaSyDuhZIQ3E95ePF6746V59W_PvRJzO92s8Q";
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const fullPrompt = `أنت مساعد قانوني محترف في القانون المصري. اكتب ${selectedTag} بصياغة قانونية رصينة ودقيقة بناءً على التفاصيل التالية: ${prompt}`;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text }),
    };

  } catch (error) {
    console.error("AI Generation Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "An unknown server error occurred." }),
    };
  }
};

export { handler };
