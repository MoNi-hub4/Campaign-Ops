import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import PriorityItem from "../models/PriorityItem.js";

dotenv.config();

const router = express.Router();

// server/routes/chatReviewRoutes.js

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error("❌ CRITICAL ERROR: GEMINI_API_KEY is undefined in environment variables!");
}

// Pass key explicitly
const ai = new GoogleGenAI({ apiKey });

const DEFAULT_VIPS = [
  "Yahia Ashour",
  "Mohamed Kameh",
  "Ali Shaaban",
  "Mohammed Amreey",
  "Akshat Jain",
  "Sushant Singh",
  "Rana Khalifa",
  "Al Fayad Nizamdeen",
];

const DEFAULT_CAMPAIGN_KEYWORDS = [
  "Coupon",
  "Festival",
  "Sale",
  "Launch",
  "Discount",
  "QC",
  "CMS",
  "Offer",
  "Deal",
  "FC27",
  "EXTRA",
];

const FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite"];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// POST /api/chat-review/scan-image - Gemini Vision API
router.post("/scan-image", async (req, res) => {
  try {
    const { imageBase64, vipList, campaignKeywords, customPrompt } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ message: "No image payload provided." });
    }

    const vips = vipList && vipList.length > 0 ? vipList : DEFAULT_VIPS;
    const keywords = campaignKeywords && campaignKeywords.length > 0 ? campaignKeywords : DEFAULT_CAMPAIGN_KEYWORDS;
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const systemInstruction = `
      You are an executive AI assistant reviewing chat screenshot threads.
      Your task is to parse all visible chat threads and generate a structured priority table with context and ideas.

      PRIORITY RULES:
      1. Priority 1 (VIP Opener): Assigned if the thread was opened by any of these specific individuals:
         ${vips.map((v) => `- ${v}`).join("\n")}
      2. Priority 2 (Campaign / Event / Offer): Assigned if the thread is NOT opened by a VIP, BUT contains a campaign, offer, promotion, or event keyword like:
         ${keywords.map((k) => `- ${k}`).join("\n")}
      3. Priority 3 (Check Later / General): Assigned to all other thread openers or general topics.

      CUSTOM USER PROMPT INSTRUCTION:
      ${customPrompt || "Focus on identifying commercial risks, product bugs, and high-impact sales events."}
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        threads: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              openerName: { type: Type.STRING },
              threadTitle: { type: Type.STRING },
              priorityLevel: {
                type: Type.STRING,
                enum: [
                  "Priority 1 (VIP Opener)",
                  "Priority 2 (Campaign / Event)",
                  "Priority 3 (General Check)",
                ],
              },
              market: { type: Type.STRING },
              whyItMatters: { type: Type.STRING },
              commercialIdea: { type: Type.STRING },
            },
            required: [
              "openerName",
              "threadTitle",
              "priorityLevel",
              "market",
              "whyItMatters",
              "commercialIdea",
            ],
          },
        },
      },
      required: ["threads"],
    };

    let responseText = null;
    let lastError = null;

    for (const modelName of FALLBACK_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout requesting ${modelName}`)), 30000)
          );

          const apiPromise = ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: "user",
                parts: [
                  { text: systemInstruction },
                  { inlineData: { mimeType: "image/png", data: base64Data } },
                ],
              },
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: responseSchema,
            },
          });

          const resData = await Promise.race([apiPromise, timeoutPromise]);
          responseText = resData.text;
          if (responseText) break;
        } catch (err) {
          lastError = err;
          await delay(1200);
        }
      }
      if (responseText) break;
    }

    if (!responseText) throw lastError || new Error("All Gemini model attempts failed.");

    const parsedJson = JSON.parse(responseText);
    return res.json({ success: true, results: parsedJson.threads || [] });
  } catch (err) {
    console.error("Gemini AI Final Processing Error:", err);
    return res.status(500).json({ message: "Gemini AI failed to process image", error: err.message });
  }
});

// POST /api/chat-review/analyze-thread-text - Detailed AI Thread Text Analysis
router.post("/analyze-thread-text", async (req, res) => {
  try {
    const { threadText, threadTitle, openerName } = req.body;

    if (!threadText || threadText.trim().length === 0) {
      return res.status(400).json({ message: "No thread text provided." });
    }

    const systemInstruction = `
      You are a strategic commercial & campaign operations executive assistant.
      Analyze the provided full conversation transcript from a chat thread titled "${threadTitle || "Discussion"}" started by "${openerName || "Team Member"}".

      Provide a concise breakdown formatted in clear JSON matching this schema:
      - executiveSummary: A 2-sentence summary of what is happening.
      - keyTakeaways: A list of 3-4 key facts, decisions, or issues discussed.
      - potentialRisksOrBlockers: Critical risks, stock/tech issues, or missed opportunities.
      - recommendedActionOrReply: Exact strategic response or action the user should post/take to resolve or add value to this thread.
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        executiveSummary: { type: Type.STRING },
        keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
        potentialRisksOrBlockers: { type: Type.STRING },
        recommendedActionOrReply: { type: Type.STRING },
      },
      required: [
        "executiveSummary",
        "keyTakeaways",
        "potentialRisksOrBlockers",
        "recommendedActionOrReply",
      ],
    };

    let responseText = null;
    let lastError = null;

    for (const modelName of FALLBACK_MODELS) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out")), 25000)
        );

        const apiPromise = ai.models.generateContent({
          model: modelName,
          contents: [
            { role: "user", parts: [{ text: systemInstruction }, { text: `CHAT TRANSCRIPT:\n\n${threadText}` }] },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          },
        });

        const apiRes = await Promise.race([apiPromise, timeoutPromise]);
        responseText = apiRes.text;
        if (responseText) break;
      } catch (err) {
        lastError = err;
        await delay(1000);
      }
    }

    if (!responseText) throw lastError || new Error("Failed to analyze thread text.");

    return res.json({ success: true, analysis: JSON.parse(responseText) });
  } catch (err) {
    console.error("Thread Text Analysis Error:", err);
    return res.status(500).json({ message: "Failed to analyze thread text", error: err.message });
  }
});

// GET /api/chat-review - Fetch saved items from MongoDB
router.get("/", async (req, res) => {
  try {
    const { date } = req.query;
    const filter = date ? { reviewDate: date } : {};
    const items = await PriorityItem.find(filter).sort({ createdAt: -1 });
    return res.json(items);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch items", error: err.message });
  }
});

// POST /api/chat-review - Save generated priorities to MongoDB
router.post("/", async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: "Invalid payload" });
    }
    const savedRecords = await PriorityItem.insertMany(items);
    return res.status(201).json(savedRecords);
  } catch (err) {
    return res.status(500).json({ message: "Failed to save priorities", error: err.message });
  }
});

// PATCH /api/chat-review/:id - Update status OR thread deep-dive analysis
router.patch("/:id", async (req, res) => {
  try {
    const updateData = {};
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.rawThreadText !== undefined) updateData.rawThreadText = req.body.rawThreadText;
    if (req.body.threadAnalysis !== undefined) updateData.threadAnalysis = req.body.threadAnalysis;

    const updated = await PriorityItem.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: "Failed to update item", error: err.message });
  }
});

// DELETE /api/chat-review/:id - Delete item from MongoDB
router.delete("/:id", async (req, res) => {
  try {
    await PriorityItem.findByIdAndDelete(req.params.id);
    return res.json({ message: "Deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete item", error: err.message });
  }
});

export default router;