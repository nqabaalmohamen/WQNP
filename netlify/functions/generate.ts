import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { prompt, selectedTag } = await req.json();

    if (!prompt || !selectedTag) {
      return new Response(JSON.stringify({ error: "Missing prompt or selectedTag" }), { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const fullPrompt = `أنت مساعد قانوني محترف في القانون المصري. اكتب ${selectedTag} بصياغة قانونية رصينة ودقيقة بناءً على التفاصيل التالية: ${prompt}`;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return new Response(JSON.stringify({ text }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("AI Generation Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
