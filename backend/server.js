import express from "express";
import cors from "cors";
import { loadDB, saveDB } from "./database.js";
import { scrapeProduct } from "./scraper.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/products", (req, res) => {
    const db = loadDB();
    res.json(db.products);
});

//single product route - use query parameter to handle URLs with slashes
app.get("/api/product", (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: "URL parameter is required" });
    }
    const db = loadDB();
    const product = db.products.find(p => p.url === url);
    res.json(product || {});
});
// add product route
app.post("/api/add-product", (req, res) => {
    const { url, site } = req.body;
    if (!url) {
        return res.status(400).json({ error: "URL is required" });
    }
    const db = loadDB();
    const product = db.products.find(p => p.url === url);
    if (product) return res.status(400).json({ error: "Product already exists" });
    
    // Auto-detect site if not provided
    let detectedSite = site;
    if (!detectedSite) {
        if (url.includes('amazon.in') || url.includes('amazon.com')) {
            detectedSite = 'amazon';
        } else if (url.includes('flipkart.com')) {
            detectedSite = 'flipkart';
        } else if (url.includes('vijaysales.com')) {
            detectedSite = 'vijaysales';
        }
    }
    
    db.products.push({ url, site: detectedSite || 'unknown', title: "", history: [] });
    saveDB(db);
    
    // Trigger immediate scrape for the new product (in background, don't block response)
    scrapeProduct(url, detectedSite).then(result => {
        const db = loadDB();
        const product = db.products.find(p => p.url === url);
        if (product && result) {
            if (result.title) product.title = result.title;
            product.history.push({
                price: result.price,
                timestamp: new Date().toISOString()
            });
            saveDB(db);
            console.log(`✓ Initial price scraped for new product: ${url} - ${result.price}`);
        }
    }).catch(err => {
        console.error(`Failed to scrape initial price for ${url}:`, err.message);
    });
    
    res.json({ message: "Product added successfully. Scraping initial price in background..." });
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
        sites: [
            { name: 'amazon', displayName: 'Amazon', urlPattern: 'amazon.in, amazon.com' },
            { name: 'flipkart', displayName: 'Flipkart', urlPattern: 'flipkart.com' },
            { name: 'vijaysales', displayName: 'Vijay Sales', urlPattern: 'vijaysales.com' }
        ]
    });
});

// Start scheduler when server starts
import('./schedular.js').catch(err => {
    console.error('Failed to start scheduler:', err.message);
});

app.listen(3001, () => {
    console.log("API running on port 3001");
    console.log("Price scraper scheduler is running (checks every 10 minutes)");
});
