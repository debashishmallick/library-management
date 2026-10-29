const { GoogleGenAI } = require("@google/genai");

const MODEL = process.env.AI_MODEL || "gemini-3.5-flash";
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

function getClient() {
  if (!ai) {
    const err = new Error("AI features are not configured on the server");
    err.statusCode = 503;
    throw err;
  }
  return ai;
}

module.exports = { getClient, MODEL };