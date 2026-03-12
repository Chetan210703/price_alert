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

// Send message to a specific chat ID
export async function sendTelegramMessage(chatId, text, parseMode = "Markdown") {
    if (!BOT_TOKEN) {
        console.error("BOT_TOKEN not set");
        return false;
    }

    try {
        const sendUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        await axios.post(sendUrl, {
            chat_id: chatId,
            text,
            parse_mode: parseMode
        });
        return true;
    } catch (err) {
        console.error(`Failed to send message to ${chatId}:`, err?.response?.data || err.message);
        return false;
    }
}

// Handle incoming webhook update from Telegram
export async function handleTelegramUpdate(update) {
    if (!update.message) return;

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text || "";
    const username = message.chat.username || message.chat.first_name || "User";

    // Handle /start or /connect command
    if (text.startsWith("/start") || text.startsWith("/connect")) {
        // Check if user already exists
        const existingUser = await getUserByChatId(chatId);
        
        if (existingUser && existingUser.active) {
            // User already connected
            await sendTelegramMessage(
                chatId,
                `✅ *You're already connected!*\n\nYou will receive price alerts for all tracked products.\n\nTo disconnect, send /disconnect`,
                "Markdown"
            );
        } else if (existingUser && !existingUser.active) {
            // User exists but is inactive, reactivate
            await updateUser(chatId, { active: true, connectedAt: new Date().toISOString() });
            await sendTelegramMessage(
                chatId,
                `🎉 *Reconnected!*\n\nYou will now receive price alerts and coupon notifications for all tracked products.\n\nTo disconnect, send /disconnect`,
                "Markdown"
            );
            console.log(`✓ User reconnected: ${username} (${chatId})`);
        } else {
            // Add new user
            await addUser({
                chatId: chatId,
                username: username,
                connectedAt: new Date().toISOString(),
                active: true
            });

            await sendTelegramMessage(
                chatId,
                `🎉 *Successfully Connected!*\n\nYou will now receive price alerts and coupon notifications for all tracked products.\n\nTo disconnect, send /disconnect`,
                "Markdown"
            );
            
            console.log(`✓ New user connected: ${username} (${chatId})`);
        }
    }
    // Handle /disconnect command
    else if (text.startsWith("/disconnect")) {
        const user = await getUserByChatId(chatId);
        
        if (user && user.active) {
            await updateUser(chatId, {
                active: false,
                disconnectedAt: new Date().toISOString()
            });

            await sendTelegramMessage(
                chatId,
                `👋 *Disconnected*\n\nYou will no longer receive price alerts.\n\nTo reconnect, send /start`,
                "Markdown"
            );
            
            console.log(`User disconnected: ${username} (${chatId})`);
        } else {
            await sendTelegramMessage(
                chatId,
                `You're not currently connected. Send /start to connect.`,
                "Markdown"
            );
        }
    }
    // Handle /status command
    else if (text.startsWith("/status")) {
        const user = await getUserByChatId(chatId);
        
        if (user && user.active) {
            await sendTelegramMessage(
                chatId,
                `✅ *Status: Connected*\n\nYou're receiving price alerts for all tracked products.`,
                "Markdown"
            );
        } else {
            await sendTelegramMessage(
                chatId,
                `❌ *Status: Not Connected*\n\nSend /start to connect and receive alerts.`,
                "Markdown"
            );
        }
    }
    // Handle unknown commands
    else if (text.startsWith("/")) {
        await sendTelegramMessage(
            chatId,
            `🤖 *Price Alert Bot*\n\nAvailable commands:\n/start - Connect to receive alerts\n/status - Check connection status\n/disconnect - Stop receiving alerts`,
            "Markdown"
        );
    }
}

// Get bot username/info
export async function getBotInfo() {
    if (!BOT_TOKEN) {
        return null;
    }

    try {
        const response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
        return response.data.result;
    } catch (err) {
        console.error("Failed to get bot info:", err.message);
        return null;
    }
}

// Check if a chat ID is connected
export async function isUserConnected(chatId) {
    const user = await getUserByChatId(chatId);
    return !!(user && user.active);
}

// Get all active users (already exported from database.js, but keeping for backward compatibility)
export { getActiveUsers };

