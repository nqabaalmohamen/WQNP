import { Handler } from '@netlify/functions';

const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const GEMINI_KEY = payload.apiKey || process.env.GEMINI_KEY || "";

    if (!GEMINI_KEY) {
      // Return mock response to allow local testing without Google key
      const mock = {
        candidates: [
          { output: { content: [{ type: 'text', text: 'Mock result: no GEMINI_KEY provided.' }] } }
        ],
        metadata: { mocked: true }
      };
      return { statusCode: 200, headers, body: JSON.stringify(mock) };
    }

    // Check available models first
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`;
    const listResp = await fetch(listUrl);
    if (!listResp.ok) {
      const text = await listResp.text();
      return { statusCode: listResp.status, headers, body: JSON.stringify({ error: `ListModels failed: ${text}` }) };
    }
    const listData = await listResp.json();
    const available = Array.isArray(listData.models) ? listData.models.map((m: any) => m.name) : [];

    // Determine target model: accept payload.model or pick a Gemini model if available
    const requestedModel = payload.model;
    let targetModel = null;
    if (requestedModel) {
      if (available.includes(requestedModel)) targetModel = requestedModel;
      else if (available.includes(`models/${requestedModel}`)) targetModel = `models/${requestedModel}`;
      else targetModel = available.find((n: string) => n.includes(requestedModel)) || null;
    }
    if (!targetModel) targetModel = available.find((n: string) => n.toLowerCase().includes('gemini')) || available[0] || null;

    if (!targetModel) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'No models available from Google Generative Language API.' }) };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${targetModel}:generateContent?key=${GEMINI_KEY}`;
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      return { statusCode: apiResponse.status, headers, body: JSON.stringify({ error: `Google API Error: ${errorText}`, availableModels: available }) };
    }

    const data = await apiResponse.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };

  } catch (err) {
    console.error("Serverless Function Error:", err);
    const message = err && typeof err === 'object' && 'message' in err ? (err as any).message : String(err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: message || "Unknown server error" }),
    };
  }
};

export { handler };
