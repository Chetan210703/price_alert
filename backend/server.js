import express from "express";
import cors from "cors";
import axios from "axios";
import { getAllProducts, getProductByUrl, addProduct, updateProduct, addProductHistory, deleteProduct } from "./db/database.js";
import { connectDB } from "./db/mongodb.js";
import { handleTelegramUpdate, getBotInfo, getActiveUsers, isUserConnected, setupTelegram, getWebhookInfo, setTelegramWebhook, buildTelegramConnectLink } from "./telegramBot.js";
import { validateProductUrl, getSupportedSites } from "./utils/urlValidator.js";
import { chatAboutPriceTrend } from "./geminiChat.js";
import { runInitialScrape } from "./jobs/initialScrape.js";
import { logStep, logError, logWarn } from "./utils/logger.js";



const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());

function resolveSiteName(site, detectedSite) {
    const raw = String(site || detectedSite || "").toLowerCase();
    if (raw.includes("amazon")) return "amazon";
    if (raw.includes("flipkart")) return "flipkart";
    if (raw.includes("vijay")) return "vijaysales";
    return detectedSite;
}

// Initialize MongoDB connection on startup
connectDB().catch(err => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
});

app.get("/api/products", async (req, res) => {
    try {
        const products = await getAllProducts();
        res.json(products);
    } catch (err) {
        console.error("Error fetching products:", err);
        res.status(500).json({ error: "Failed to fetch products" });
    }
});

//single product route - use query parameter to handle URLs with slashes
app.get("/api/product", async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: "URL parameter is required" });
    }
    try {
        const product = await getProductByUrl(url);
        res.json(product || {});
    } catch (err) {
        console.error("Error fetching product:", err);
        res.status(500).json({ error: "Failed to fetch product" });
    }
});
// add product route
app.post("/api/add-product", async (req, res) => {
    const { url, site } = req.body;

    try {
        logStep("add-product", "1/4", "Request received", { url, site });

        const validation = validateProductUrl(url);
        if (!validation.valid) {
            logWarn("add-product", "FAIL", "URL validation failed", validation.error);
            return res.status(400).json({ error: validation.error });
        }

        const normalizedUrl = validation.normalizedUrl;
        const detectedSite = validation.site;
        const finalSite = resolveSiteName(site, detectedSite);
        logStep("add-product", "2/4", "URL validated", { normalizedUrl, detectedSite, finalSite });

        const existingProduct = await getProductByUrl(normalizedUrl);
        if (existingProduct) {
            logWarn("add-product", "FAIL", "Product already exists", normalizedUrl);
            return res.status(400).json({ error: "Product already exists" });
        }

        const newProduct = {
            url: normalizedUrl,
            site: finalSite,
            title: "",
            history: [],
            scrapeStatus: "pending",
            scrapeError: null,
            lastScrapeAt: null,
        };

        await addProduct(newProduct);
        logStep("add-product", "3/4", "Saved to MongoDB (scrapeStatus: pending)", { url: normalizedUrl });

        runInitialScrape(normalizedUrl, finalSite).catch((err) => {
            logError("add-product", "4/4", "Background scrape failed", err);
        });

        logStep("add-product", "4/4", "Background scrape queued — response sent to client");

        res.json({
            message: "Product added successfully. Scraping initial price in background...",
            url: normalizedUrl,
            site: finalSite,
            scrapeStatus: "pending",
        });
    } catch (err) {
        logError("add-product", "FAIL", "Unexpected error", err);
        res.status(500).json({ error: "Failed to add product" });
    }
});

// delete product route
app.delete("/api/product", async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: "URL parameter is required" });
    }
    
    try {
        const deleted = await deleteProduct(url);
        if (!deleted) {
            return res.status(404).json({ error: "Product not found" });
        }
        
        console.log(`✓ Product deleted: ${url}`);
        res.json({ message: "Product deleted successfully" });
    } catch (err) {
        console.error("Error deleting product:", err);
        res.status(500).json({ error: "Failed to delete product" });
    }
});

// manual scrape endpoint
app.post("/api/scrape", async (req, res) => {
    try {
        const { scrapeAllProducts } = await import('./scraper.js');
        // Run scraping in background (don't wait for it)
        scrapeAllProducts().catch(err => {
            console.error('Background scraping error:', err.message);
        });
        res.json({ message: "Scraping started in background. This may take a few minutes." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// AI chat — price trend analysis via Google Gemini
app.post("/api/chat", async (req, res) => {
    const { message, productUrl } = req.body;

    try {
        const result = await chatAboutPriceTrend({ message, productUrl });
        res.json(result);
    } catch (err) {
        console.error("Chat error:", err.message);
        const msg = err.message || "Something went wrong";
        const status = msg.includes("not set") ? 503
            : msg.includes("busy right now") || msg.includes("Too many requests") ? 503
            : msg.includes("not found") ? 404
            : msg.includes("required") ? 400
            : 500;
        res.status(status).json({ error: msg });
    }
});

// get supported sites
app.get("/api/supported-sites", (req, res) => {
    res.json({
        sites: getSupportedSites()
    });
});

// Telegram webhook endpoint
app.post("/api/telegram-webhook", async (req, res) => {
    try {
        const update = req.body;
        await handleTelegramUpdate(update);
        res.status(200).json({ ok: true });
    } catch (err) {
        console.error("Webhook error:", err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// Get bot info and connection link
app.get("/api/telegram-bot-info", async (req, res) => {
    try {
        const botInfo = await getBotInfo();
        const webhookInfo = await getWebhookInfo();
        if (!botInfo) {
            return res.status(503).json({
                error: "Telegram bot unavailable. Check BOT_TOKEN and network access to api.telegram.org.",
                connected: false
            });
        }

        const botUsername = botInfo.username;
        const botLink = `https://t.me/${botUsername}`;
        const connectLink = buildTelegramConnectLink(botUsername);
        const activeUsers = await getActiveUsers();

        res.json({
            botUsername,
            botLink,
            connectLink,
            activeUsersCount: activeUsers.length,
            connected: true,
            webhookUrl: webhookInfo?.url || null,
            webhookPendingUpdates: webhookInfo?.pending_update_count ?? null
        });
    } catch (err) {
        res.status(500).json({ error: err.message, connected: false });
    }
});

// Debug webhook status
app.get("/api/telegram-webhook-info", async (req, res) => {
    try {
        const webhookInfo = await getWebhookInfo();
        res.json(webhookInfo || { url: "", pending_update_count: 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Check if a specific chat ID is connected (for testing)
app.get("/api/telegram-status", async (req, res) => {
    const chatId = req.query.chatId;
    if (!chatId) {
        return res.status(400).json({ error: "chatId parameter required" });
    }

    try {
        const connected = await isUserConnected(parseInt(chatId));
        res.json({ connected });
    } catch (err) {
        console.error("Error checking user status:", err);
        res.status(500).json({ error: "Failed to check status" });
    }
});

// Setup webhook endpoint (call this once to configure Telegram webhook)
app.post("/api/telegram-setup-webhook", async (req, res) => {
    try {
        const webhookUrl =
            req.body.webhookUrl ||
            process.env.TELEGRAM_WEBHOOK_URL ||
            `${req.protocol}://${req.get("host")}/api/telegram-webhook`;

        const telegramResponse = await setTelegramWebhook(webhookUrl);

        res.json({
            success: true,
            message: "Webhook configured successfully",
            webhookUrl,
            telegramResponse
        });
    } catch (err) {
        res.status(500).json({
            error: err.message,
            details: err?.response?.data
        });
    }
});

// Test alert — sends a message to all connected users
app.post("/api/telegram-test-alert", async (req, res) => {
    try {
        const { sendAlert } = await import("./alert.js");
        await sendAlert("✅ Test alert from Price Tracker. Telegram notifications are working!");
        res.json({ message: "Test alert sent to connected users" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start scheduler when server starts
import('./schedular.js').catch(err => {
    console.error('Failed to start scheduler:', err.message);
});

app.listen(3001, async () => {
    console.log("API running on port 3001");
    console.log("Price scraper scheduler is running (checks every 10 minutes)");
    try {
        const telegram = await setupTelegram();
        console.log("Telegram mode:", telegram.mode);
    } catch (err) {
        console.error("Telegram setup failed:", err.message);
    }
});


app.get("/api/health", (req, res) => res.send("Awake!"));