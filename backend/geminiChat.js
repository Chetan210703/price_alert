import { GoogleGenAI } from "@google/genai";
import { getProductByUrl } from "./db/database.js";

const RETRYABLE_STATUSES = new Set(["UNAVAILABLE", "RESOURCE_EXHAUSTED"]);

function parseGeminiApiError(err) {
    const raw = err?.message || String(err);
    try {
        if (raw.trim().startsWith("{")) return JSON.parse(raw)?.error ?? null;
    } catch {}
    return err?.error ?? null;
}

function isRetryableGeminiError(err) {
    const apiError = parseGeminiApiError(err);
    const code = apiError?.code ?? err?.status;
    return code === 503 || code === 429 || RETRYABLE_STATUSES.has(apiError?.status);
}

function toFriendlyGeminiError(err) {
    const apiError = parseGeminiApiError(err);
    const code = apiError?.code ?? err?.status;
    const status = apiError?.status;

    if (code === 503 || status === "UNAVAILABLE") {
        return new Error("The AI service is busy right now. Please try again in a moment.");
    }
    if (code === 429 || status === "RESOURCE_EXHAUSTED") {
        return new Error("Too many requests. Please wait a moment before trying again.");
    }
    if (apiError?.message) {
        return new Error(apiError.message);
    }
    return new Error("Something went wrong. Please try again.");
}

async function generateWithRetry(ai, prompt, maxAttempts = 3) {
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });
        } catch (err) {
            lastErr = err;
            if (!isRetryableGeminiError(err) || attempt === maxAttempts) {
                throw toFriendlyGeminiError(err);
            }
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
    }
    throw toFriendlyGeminiError(lastErr);
}

function buildPriceContext(product) {
    if (!product) {
        return "No product selected.";
    }

    const history = product.history || [];
    const historyLines = history.map((entry, i) => {
        const date = new Date(entry.timestamp).toISOString();
        const coupon =
            typeof entry.couponAvailable === "boolean"
                ? entry.couponAvailable
                    ? `coupon: ${entry.couponText || "yes"}`
                    : "no coupon"
                : "coupon unknown";
        return `${i + 1}. ${date} — ${entry.price} (${coupon})`;
    });

    return [
        `Product: ${product.title || "Unknown"}`,
        `Site: ${product.site || "Unknown"}`,
        `URL: ${product.url}`,
        `Price history (${history.length} data points):`,
        historyLines.length ? historyLines.join("\n") : "No price history yet.",
    ].join("\n");
}

export async function chatAboutPriceTrend({ message, productUrl }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set in .env");
    }

    if (!message?.trim()) {
        throw new Error("Message is required");
    }

    let product = null;
    if (productUrl) {
        product = await getProductByUrl(productUrl);
        if (!product) {
            throw new Error("Product not found");
        }
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `
    You are a price-tracking assistant for an e-commerce price alert application.
    
    Your primary role is to analyze product price history and answer questions about:
    - Price trends
    - Price changes
    - Discounts and coupons
    - Best time to buy
    - Historical pricing data
    
    Rules:
    1. Only answer questions related to the provided product and its price history.
    2. If a user asks a question unrelated to product pricing or price history, politely respond:
       "I can only help with product price analysis and price history questions."
    3. Do not answer general knowledge, personal, coding, medical, legal, or unrelated questions.
    4. If there is insufficient price data, explain that more history is needed.
    5. Use Indian Rupees (₹) when discussing prices.
    6. Never invent prices or historical data not present in the provided information.
    `;

    const prompt = `${systemPrompt}

--- Product data ---
${buildPriceContext(product)}

--- User question ---
${message.trim()}`;

    const result = await generateWithRetry(ai, prompt);
    const reply = result.text;

    return { reply };
}