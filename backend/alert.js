import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables. Prefer project root .env, but also fall back to backend/.env.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, "../.env");
const backendEnv = path.resolve(__dirname, ".env");
dotenv.config({ path: rootEnv });
dotenv.config({ path: backendEnv, override: false }); // only fill missing vars'



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
        const {
            url,
            site,
            oldPrice,
            newPrice,
            couponAvailable,
            couponText
        } = message;
        const siteLabel = site
            ? site.charAt(0).toUpperCase() + site.slice(1)
            : "Product";

        const couponLine =
            typeof couponAvailable === "boolean"
                ? couponAvailable
                    ? `Coupon: Available${couponText ? ` - ${couponText}` : ""}`
                    : "Coupon: Not available"
                : null;

        text = [
            `*Price Alert for ${siteLabel}*`,
            site ? `Site: ${site}` : null,
            oldPrice !== undefined ? `Old Price: ${oldPrice}` : null,
            newPrice !== undefined ? `New Price: ${newPrice}` : null,
            couponLine,
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
