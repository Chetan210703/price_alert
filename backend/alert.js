import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from project root (.env)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
export async function sendAlert(message) {
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHAT_ID = process.env.CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
        console.error("BOT_TOKEN or CHAT_ID environment variable not set.");
        return;
    }

    let text;
    // Accept both string messages and structured information
    if (typeof message === "string") {
        text = message;
    } else if (typeof message === "object" && message !== null) {
        // Support for both old and new parameter shapes
        const { url, site, oldPrice, newPrice } = message;
        text = [
            " *Price Alert for Vijay Sales*",
            site ? `Site: ${site}` : null,
            oldPrice !== undefined ? `Old Price: ${oldPrice}` : null,
            newPrice !== undefined ? `New Price: ${newPrice}` : null,
            url ? `URL: ${url}` : null
        ].filter(Boolean).join("\n");
    } else {
        text = String(message);
    }

    const sendUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    try {
        await axios.post(sendUrl, {
            chat_id: CHAT_ID,
            text,
            parse_mode: "Markdown"
        });
        console.log("Telegram alert sent!");
    } catch (err) {
        console.error("Telegram error:", err?.response?.data || err.message || err);
    }
}
