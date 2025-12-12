import { chromium } from 'playwright';
import { loadDB, saveDB } from '../backend/database.js';
import { sendAlert } from './alert.js';

// async function scrapeAmazon() {
//     const browser = await chromium.launch({ headless: true });
//     const page = await browser.newPage();
//     const url = 'https://www.amazon.in/gp/product/B07PWZZ4YV/ref=ox_sc_act_title_1?smid=&psc=1 ';
//     await page.goto(url,{waitUntil: 'domcontentloaded'});
    
//     const selector = ["#corePriceDisplay_desktop_feature_div .a-price-whole", "#priceblock_ourprice", "#priceblock_dealprice"];
//     let price = null;
//     for (let s of selector) {
//         price = await page.$eval(s, (el) => el.innerText.trim())
//         .catch(() => null);
//         if (price) {
//             break;
//         }
//     }
//     if (!price) {
//         throw new Error('Price not found');
//     }
//     console.log(`Price: ${price}`);
//     await browser.close();
// }
// scrapeAmazon();


export default async function scrapeVijayStore() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const url = 'https://www.vijaysales.com/p/P220946/220946/apple-iphone-15-128-gb-storage-black';

    // Retry navigation if network changes
    const gotoWithRetry = async () => {
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
                return;
            } catch (err) {
                if (!err.message.includes("ERR_NETWORK_CHANGED") || attempt === maxAttempts) {
                    throw err;
                }
                console.warn(`Network changed, retrying (${attempt}/${maxAttempts - 1})...`);
                await page.waitForTimeout(1500 * attempt);
            }
        }
    };

    try {
        await gotoWithRetry();

        const selector = ".product__price--price";
        let price = null;

        try {
            await page.waitForSelector(selector, { state: "attached", timeout: 10000 });
            price = await page.$eval(selector, (el) => el.innerText.trim());
        } catch (error) {
            console.log("Primary selector failed, trying alternatives...");

            const alternatives = [
                '.product__price--price',
                '[class*="price"]',
                '.price',
                '.product-price'
            ];

            for (const alt of alternatives) {
                try {
                    price = await page.$eval(alt, (el) => el.innerText.trim());
                    if (price) break;
                } catch {}
            }

            if (!price) {
                console.log("Page title:", await page.title());
                console.log("Current URL:", page.url());
                throw new Error("Price not found");
            }
        }

        console.log("Price:", price);

        // Load the database
        const db = loadDB();

        // Get the product from the database
        let product = db.products.find(p => p.url === url);

        if (!product) {
            product = {
                url,
                site: "vijaysales",
                title: "", // we add later
                history: []
            };
            db.products.push(product);
        }

        // Check previous price
        const previousEntry = product.history[product.history.length - 1];

        // Save only if different
        if (!previousEntry || previousEntry.price !== price) {
            product.history.push({
                price,
                timestamp: new Date().toISOString()
            });

            saveDB(db);
            console.log("Saved new price!");

            try {
                await sendAlert(`
Price Update!
Site: Vijay Sales
URL: ${url}
Old Price: ${previousEntry ? previousEntry.price : "N/A"}
New Price: ${price}
`);
                console.log("Alert sent");
            } catch (err) {
                console.error("Alert failed:", err.message);
            }
        } else {
            console.log("No price change, not saving.");
        }

    } catch (err) {
        console.error("Scraper failed:", err.message);
    } finally {
        await browser.close().catch(() => {});
    }
}
