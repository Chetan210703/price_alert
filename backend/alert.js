import { sendTelegramMessage, getActiveUsers } from "./telegramBot.js";

export async function sendAlert(message) {
    const activeUsers = getActiveUsers();

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
