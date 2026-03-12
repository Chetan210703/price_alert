import express from "express";
import cors from "cors";
import axios from "axios";
import { getAllProducts, getProductByUrl, addProduct, updateProduct, addProductHistory, deleteProduct } from "./db/database.js";
import { connectDB } from "./db/mongodb.js";
import { scrapeProduct } from "./scraper.js";
import { handleTelegramUpdate, getBotInfo, getActiveUsers, isUserConnected } from "./telegramBot.js";
import { validateProductUrl, getSupportedSites } from "./utils/urlValidator.js";

const app = express();
app.use(cors());
app.use(express.json());

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
        // Validate URL format and supported site
        const validation = validateProductUrl(url);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }
        
        const normalizedUrl = validation.normalizedUrl;
        const detectedSite = validation.site;
        
        // Check if product already exists
        const existingProduct = await getProductByUrl(normalizedUrl);
        if (existingProduct) {
            return res.status(400).json({ error: "Product already exists" });
        }
        
        // Use detected site or provided site
        const finalSite = site || detectedSite;
        
        // Create new product
        const newProduct = {
            url: normalizedUrl,
            site: finalSite,
            title: "",
            history: []
        };
        
        await addProduct(newProduct);
        
        // Trigger immediate scrape for the new product (in background, don't block response)
        scrapeProduct(normalizedUrl, finalSite).then(async result => {
            try {
                const product = await getProductByUrl(normalizedUrl);
                if (product && result) {
                    const updates = {};
                    if (result.title) updates.title = result.title;
                    
                    const historyEntry = {
                        price: result.price,
                        couponAvailable: typeof result.couponAvailable === 'boolean'
                            ? result.couponAvailable
                            : null,
                        couponText: result.couponText || null,
                        timestamp: new Date().toISOString()
                    };
                    
                    await updateProduct(normalizedUrl, updates);
                    await addProductHistory(normalizedUrl, historyEntry);
                    
                    console.log(`✓ Initial price scraped for new product: ${normalizedUrl} - ${result.price}`);
                }
            } catch (err) {
                console.error(`Error updating product after scrape: ${err.message}`);
            }
        }).catch(err => {
            console.error(`Failed to scrape initial price for ${normalizedUrl}:`, err.message);
        });
        
        res.json({ message: "Product added successfully. Scraping initial price in background..." });
    } catch (err) {
        console.error("Error adding product:", err);
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
        if (!botInfo) {
            return res.status(500).json({ error: "Bot token not configured" });
        }

        const botUsername = botInfo.username;
        const botLink = `https://t.me/${botUsername}`;
        const activeUsers = await getActiveUsers();

        res.json({
            botUsername,
            botLink,
            activeUsersCount: activeUsers.length,
            connected: true
        });
    } catch (err) {
        res.status(500).json({ error: err.message, connected: false });
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
        const BOT_TOKEN = process.env.BOT_TOKEN;
        if (!BOT_TOKEN) {
            return res.status(500).json({ error: "BOT_TOKEN not configured" });
        }

        // Get webhook URL from request or use default
        const webhookUrl = req.body.webhookUrl || `${req.protocol}://${req.get('host')}/api/telegram-webhook`;
        
        const response = await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
            { url: webhookUrl }
        );

        res.json({
            success: true,
            message: "Webhook configured successfully",
            webhookUrl,
            telegramResponse: response.data
        });
    } catch (err) {
        res.status(500).json({ 
            error: err.message,
            details: err?.response?.data 
        });
    }
});

// Start scheduler when server starts
import('./schedular.js').catch(err => {
    console.error('Failed to start scheduler:', err.message);
});

app.listen(3001, () => {
    console.log("API running on port 3001");
    console.log("Price scraper scheduler is running (checks every 10 minutes)");
});
