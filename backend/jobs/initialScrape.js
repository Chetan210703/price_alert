import { scrapeProduct } from "../scraper.js";
import { getProductByUrl, updateProduct, addProductHistory } from "../db/database.js";
import { logStep, logError } from "../utils/logger.js";

export async function runInitialScrape(productUrl, site) {
    logStep("initial-scrape", "1/5", "Started", { url: productUrl, site });

    try {
        await updateProduct(productUrl, {
            scrapeStatus: "scraping",
            scrapeError: null,
            lastScrapeAt: new Date().toISOString(),
        });
        logStep("initial-scrape", "2/5", "Marked product as scraping in DB");

        logStep("initial-scrape", "3/5", "Calling scraper (Playwright)...");
        const result = await scrapeProduct(productUrl, site);
        logStep("initial-scrape", "4/5", "Scraper returned", {
            price: result.price,
            title: result.title?.slice(0, 60) || "(no title)",
        });

        const product = await getProductByUrl(productUrl);
        if (!product) {
            throw new Error("Product disappeared from DB after scrape");
        }

        const updates = {
            scrapeStatus: "success",
            scrapeError: null,
            lastScrapeAt: new Date().toISOString(),
        };
        if (result.title) {
            updates.title = result.title;
        }

        await updateProduct(productUrl, updates);

        const historyEntry = {
            price: result.price,
            couponAvailable:
                typeof result.couponAvailable === "boolean" ? result.couponAvailable : null,
            couponText: result.couponText || null,
            timestamp: new Date().toISOString(),
        };
        await addProductHistory(productUrl, historyEntry);

        logStep("initial-scrape", "5/5", "Saved title, price & history to DB", {
            price: result.price,
        });
        return { ok: true, result };
    } catch (err) {
        logError("initial-scrape", "FAIL", "Initial scrape failed", err);
        await updateProduct(productUrl, {
            scrapeStatus: "failed",
            scrapeError: err.message,
            lastScrapeAt: new Date().toISOString(),
        }).catch((dbErr) => {
            logError("initial-scrape", "FAIL", "Could not save scrape error to DB", dbErr);
        });
        throw err;
    }
}
