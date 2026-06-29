// ✅ New setup inside alert.js
import { sendTelegramMessage, escapeMarkdown } from "./telegramBot.js";
import { getActiveUsers } from "./db/database.js";

export async function sendAlert(message) {
    const activeUsers =await getActiveUsers();

    if (activeUsers.length === 0) {
        console.log("No active users connected. Alert not sent.");
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
            `*Price Alert for ${escapeMarkdown(siteLabel)}*`,
            site ? `Site: ${escapeMarkdown(site)}` : null,
            oldPrice !== undefined ? `Old Price: ${escapeMarkdown(oldPrice)}` : null,
            newPrice !== undefined ? `New Price: ${escapeMarkdown(newPrice)}` : null,
            couponLine ? escapeMarkdown(couponLine) : null,
            url ? `URL: ${escapeMarkdown(url)}` : null
        ].filter(Boolean).join("\n");
    } else {
        text = String(message);
    }

    // Send to all active users
    let successCount = 0;
    for (const user of activeUsers) {
        const success = await sendTelegramMessage(user.chatId, text, "Markdown");
        if (success) {
            successCount++;
        }
    }

    if (successCount > 0) {
        console.log(`Telegram alert sent to ${successCount} user(s)!`);
    } else {
        console.error("Failed to send Telegram alerts to any user");
    }
}
