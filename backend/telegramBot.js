import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getUserByChatId, addUser, updateUser, getActiveUsers } from "./db/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, "../.env");
const backendEnv = path.resolve(__dirname, ".env");
dotenv.config({ path: rootEnv });
dotenv.config({ path: backendEnv, override: false });

const BOT_TOKEN = process.env.BOT_TOKEN;

let pollingActive = false;
let lastUpdateId = 0;

function escapeMarkdown(text) {
    return String(text).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

async function telegramRequest(method, payload = {}) {
    if (!BOT_TOKEN) {
        throw new Error("BOT_TOKEN not set");
    }
    const response = await axios.post(
        `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
        payload,
        { timeout: 35000 }
    );
    if (!response.data?.ok) {
        throw new Error(response.data?.description || `Telegram ${method} failed`);
    }
    return response.data;
}

// Send message to a specific chat ID (retries without formatting if Markdown fails)
export async function sendTelegramMessage(chatId, text, parseMode = "Markdown") {
    if (!BOT_TOKEN) {
        console.error("BOT_TOKEN not set");
        return false;
    }

    const payload = { chat_id: chatId, text };
    if (parseMode) {
        payload.parse_mode = parseMode;
    }

    try {
        await telegramRequest("sendMessage", payload);
        return true;
    } catch (err) {
        const description = err?.response?.data?.description || err.message;
        if (parseMode && /parse entities|can't parse/i.test(description)) {
            try {
                await telegramRequest("sendMessage", { chat_id: chatId, text });
                return true;
            } catch (retryErr) {
                console.error(`Failed to send message to ${chatId}:`, retryErr?.response?.data || retryErr.message);
                return false;
            }
        }
        console.error(`Failed to send message to ${chatId}:`, err?.response?.data || err.message);
        return false;
    }
}

export function buildTelegramConnectLink(username, payload = "connect") {
    const clean = String(username || "").replace(/^@/, "");
    return `https://t.me/${clean}?start=${encodeURIComponent(payload)}`;
}

export async function handleTelegramUpdate(update) {
    if (!update.message) return;

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text || "";
    const username = message.chat.username || message.chat.first_name || "User";

    if (text.startsWith("/start") || text.startsWith("/connect")) {
        const existingUser = await getUserByChatId(chatId);

        if (existingUser && existingUser.active) {
            await sendTelegramMessage(
                chatId,
                `✅ *You're already connected\\!*\n\nYou will receive price alerts for all tracked products\\.\n\nTo disconnect, send /disconnect`
            );
        } else if (existingUser && !existingUser.active) {
            await updateUser(chatId, { active: true, connectedAt: new Date().toISOString() });
            await sendTelegramMessage(
                chatId,
                `🎉 *Reconnected\\!*\n\nYou will now receive price alerts and coupon notifications for all tracked products\\.\n\nTo disconnect, send /disconnect`
            );
            console.log(`✓ User reconnected: ${username} (${chatId})`);
        } else {
            await addUser({
                chatId,
                username,
                connectedAt: new Date().toISOString(),
                active: true
            });

            await sendTelegramMessage(
                chatId,
                `🎉 *Successfully Connected\\!*\n\nYou will now receive price alerts and coupon notifications for all tracked products\\.\n\nTo disconnect, send /disconnect`
            );

            console.log(`✓ New user connected: ${username} (${chatId})`);
        }
    } else if (text.startsWith("/disconnect")) {
        const user = await getUserByChatId(chatId);

        if (user && user.active) {
            await updateUser(chatId, {
                active: false,
                disconnectedAt: new Date().toISOString()
            });

            await sendTelegramMessage(
                chatId,
                `👋 *Disconnected*\n\nYou will no longer receive price alerts\\.\n\nTo reconnect, send /start`
            );

            console.log(`User disconnected: ${username} (${chatId})`);
        } else {
            await sendTelegramMessage(chatId, "You're not currently connected. Send /start to connect.");
        }
    } else if (text.startsWith("/status")) {
        const user = await getUserByChatId(chatId);

        if (user && user.active) {
            await sendTelegramMessage(
                chatId,
                `✅ *Status: Connected*\n\nYou're receiving price alerts for all tracked products\\.`
            );
        } else {
            await sendTelegramMessage(
                chatId,
                `❌ *Status: Not Connected*\n\nSend /start to connect and receive alerts\\.`
            );
        }
    } else if (text.startsWith("/")) {
        await sendTelegramMessage(
            chatId,
            `🤖 *Price Alert Bot*\n\nAvailable commands:\n/start \\- Connect to receive alerts\n/status \\- Check connection status\n/disconnect \\- Stop receiving alerts`
        );
    }
}

async function bootstrapChatIdFromEnv() {
    const chatIdRaw = process.env.CHAT_ID;
    if (!chatIdRaw) return;

    const chatId = parseInt(chatIdRaw, 10);
    if (Number.isNaN(chatId)) {
        console.warn("CHAT_ID in .env is not a valid number — ignoring");
        return;
    }

    const existing = await getUserByChatId(chatId);
    if (!existing) {
        await addUser({
            chatId,
            username: "env_user",
            connectedAt: new Date().toISOString(),
            active: true
        });
        console.log(`✓ Registered CHAT_ID ${chatId} from .env for price alerts`);
    } else if (!existing.active) {
        await updateUser(chatId, { active: true, connectedAt: new Date().toISOString() });
        console.log(`✓ Reactivated CHAT_ID ${chatId} from .env`);
    }
}

export async function getWebhookInfo() {
    if (!BOT_TOKEN) return null;
    try {
        const response = await axios.get(
            `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`,
            { timeout: 15000 }
        );
        return response.data?.result || null;
    } catch (err) {
        console.error("Failed to get webhook info:", err.message);
        return null;
    }
}

export async function setTelegramWebhook(webhookUrl) {
    if (!BOT_TOKEN) {
        throw new Error("BOT_TOKEN not configured");
    }
    if (!webhookUrl?.startsWith("https://")) {
        throw new Error("Webhook URL must use HTTPS");
    }

    pollingActive = false;
    const data = await telegramRequest("setWebhook", { url: webhookUrl });
    console.log(`✓ Telegram webhook set: ${webhookUrl}`);
    return data;
}

export function startTelegramPolling() {
    if (pollingActive || !BOT_TOKEN) return;
    pollingActive = true;
    console.log("✓ Telegram long-polling started (for local dev)");

    const poll = async () => {
        while (pollingActive) {
            try {
                const response = await axios.get(
                    `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`,
                    {
                        params: { offset: lastUpdateId + 1, timeout: 30 },
                        timeout: 35000
                    }
                );

                for (const update of response.data?.result || []) {
                    lastUpdateId = update.update_id;
                    await handleTelegramUpdate(update);
                }
            } catch (err) {
                if (!pollingActive) break;
                console.error("Telegram polling error:", err.message);
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        }
    };

    poll();
}

export async function setupTelegram() {
    if (!BOT_TOKEN) {
        console.warn("⚠ BOT_TOKEN not set — Telegram bot disabled");
        return { mode: "disabled" };
    }

    await bootstrapChatIdFromEnv();

    const usePolling = process.env.TELEGRAM_USE_POLLING === "true";
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL?.trim();

    if (usePolling) {
        try {
            await telegramRequest("deleteWebhook");
        } catch (err) {
            console.warn("Could not delete webhook before polling:", err.message);
        }
        startTelegramPolling();
        return { mode: "polling" };
    }

    if (webhookUrl) {
        await setTelegramWebhook(webhookUrl);
        return { mode: "webhook", url: webhookUrl };
    }

    const info = await getWebhookInfo();
    if (info?.url) {
        console.log(`✓ Telegram webhook active: ${info.url}`);
        return { mode: "webhook", url: info.url };
    }

    console.warn("⚠ Telegram bot will NOT receive /start until a webhook is configured.");
    console.warn("  Set TELEGRAM_WEBHOOK_URL=https://your-backend.com/api/telegram-webhook");
    console.warn("  Or set TELEGRAM_USE_POLLING=true for local development");
    return { mode: "none" };
}

export async function getBotInfo() {
    if (!BOT_TOKEN) {
        return null;
    }

    try {
        const response = await axios.get(
            `https://api.telegram.org/bot${BOT_TOKEN}/getMe`,
            { timeout: 15000 }
        );
        return response.data.result;
    } catch (err) {
        if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
            console.warn("Telegram API unreachable (check network/VPN/firewall):", err.message);
        } else {
            console.error("Failed to get bot info:", err.message);
        }
        return null;
    }
}

export async function isUserConnected(chatId) {
    const user = await getUserByChatId(chatId);
    return !!(user && user.active);
}

export { getActiveUsers, escapeMarkdown };
