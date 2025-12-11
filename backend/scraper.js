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

    // Retry navigation if a transient network change is detected.
    const gotoWithRetry = async () => {
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
                return;
            } catch (err) {
                const networkChanged = err.message?.includes('ERR_NETWORK_CHANGED');
                if (!networkChanged || attempt === maxAttempts) throw err;
                console.warn(`Network changed, retrying (${attempt}/${maxAttempts - 1})...`);
                await page.waitForTimeout(2000 * attempt);
            }
        }
    };

    try {
        await gotoWithRetry();

        const selector = ".product__price--price";
        let price = null;

        try {
            await page.waitForSelector(selector, { state: 'attached', timeout: 10000 });
            price = await page.$eval(selector, (el) => el.innerText.trim());
        } catch (error) {
            console.error('Error finding price element:', error.message);
            const alternativeSelectors = [
                '.product__price--price',
                '[class*="price"]',
                '.price',
                '.product-price'
            ];

            for (const altSelector of alternativeSelectors) {
                try {
                    price = await page.$eval(altSelector, (el) => el.innerText.trim());
                    if (price) break;
                } catch (e) {}
            }

            if (!price) {
                console.log(`Page title: ${await page.title()}`);
                console.log(`Current URL: ${page.url()}`);
                throw new Error("Price not found");
            }
        }

        console.log("Price:", price);

        const db = loadDB();

        //get last saved entry *before* pushing new data
        const previousEntry = db.products
            .filter(p => p.url === url)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

        console.log("previousEntry:", previousEntry ? previousEntry.price : "none");

        // Check if price changed
        if (!previousEntry || previousEntry.price !== price) {
            db.products.push({
                url,
                site: "vijaysales",
                price,
                timestamp: new Date().toISOString()
            });

            saveDB(db);
            console.log("data saved successfully");
            try {
                const message = [
                    'Vijay Sales price update:',
                    `URL: ${url}`,
                    `Old price: ${previousEntry ? previousEntry.price : "None"}`,
                    `New price: ${price}`
                ].join('\n');
                await sendAlert(message);
                console.log("Alert sent successfully");
            } catch (alertError) {
                console.error("Failed to send alert:", alertError.message);
            }
        } else {
            console.log("No change in product price, not saved.");
        }
    } finally {
        await browser.close().catch(() => {});
    }
}
    