import { chromium } from 'playwright';
import { loadDB, saveDB } from './database.js';
import { sendAlert } from './alert.js';

// Helper function to detect site from URL
function detectSite(url) {
    if (url.includes('amazon.in') || url.includes('amazon.com')) {
        return 'amazon';
    } else if (url.includes('flipkart.com')) {
        return 'flipkart';
    } else if (url.includes('vijaysales.com')) {
        return 'vijaysales';
    }
    return null;
}

// Helper function for retry navigation
async function gotoWithRetry(page, url, maxAttempts = 3) {
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
}

// Scrape Amazon
async function scrapeAmazon(page, url) {
    try {
        await gotoWithRetry(page, url);
        
        // Amazon price selectors (multiple options for different page layouts)
        const selectors = [
            '#corePriceDisplay_desktop_feature_div .a-price-whole',
            '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
            '#priceblock_ourprice',
            '#priceblock_dealprice',
            '.a-price-whole',
            '.a-price .a-offscreen',
            '[data-a-color="price"] .a-offscreen',
            '#apex_desktop .a-price-whole'
        ];
        
        let price = null;
        let title = null;
        
        // Try to get title
        try {
            title = await page.$eval('#productTitle', el => el.innerText.trim()).catch(() => null);
        } catch {}
        
        // Try each selector
        for (const selector of selectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    // For .a-offscreen, get the text content
                    if (selector.includes('.a-offscreen')) {
                        price = await page.$eval(selector, el => el.getAttribute('aria-label') || el.textContent.trim());
                    } else {
                        // For .a-price-whole, combine with currency symbol
                        const wholePart = await page.$eval(selector, el => el.innerText.trim()).catch(() => '');
                        const fractionPart = await page.$eval(selector.replace('-whole', '-fraction'), el => el.innerText.trim()).catch(() => '');
                        price = wholePart + (fractionPart ? '.' + fractionPart : '');
                    }
                    
                    // Format price with ₹ symbol
                    if (price && !price.includes('₹')) {
                        price = '₹' + price.replace(/[^\d.]/g, '');
                    }
                    
                    if (price) break;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (!price) {
            throw new Error('Price not found on Amazon page');
        }
        
        return { price: price.trim(), title: title || '' };
    } catch (err) {
        throw new Error(`Amazon scraping failed: ${err.message}`);
    }
}

// Scrape Flipkart
async function scrapeFlipkart(page, url) {
    try {
        await gotoWithRetry(page, url);
        
        // Flipkart price selectors
        const selectors = [
            '._30jeq3._16Jk6d',
            '._30jeq3',
            '._16Jk6d',
            '[class*="_30jeq3"]',
            '.dyC4hf ._30jeq3',
            '._25b18c ._30jeq3'
        ];
        
        let price = null;
        let title = null;
        
        // Try to get title
        try {
            title = await page.$eval('h1[class*="B_NuCI"], .B_NuCI, h1 span', el => el.innerText.trim()).catch(() => null);
        } catch {}
        
        // Try each selector
        for (const selector of selectors) {
            try {
                price = await page.$eval(selector, el => el.innerText.trim()).catch(() => null);
                if (price) break;
            } catch (e) {
                continue;
            }
        }
        
        if (!price) {
            throw new Error('Price not found on Flipkart page');
        }
        
        return { price: price.trim(), title: title || '' };
    } catch (err) {
        throw new Error(`Flipkart scraping failed: ${err.message}`);
    }
}

// Scrape Vijay Sales
async function scrapeVijaySales(page, url) {
    try {
        await gotoWithRetry(page, url);
        
        const selectors = [
            '.product__price--price',
            '[class*="price"]',
            '.price',
            '.product-price'
        ];
        
        let price = null;
        let title = null;
        
        // Try to get title
        try {
            title = await page.$eval('h1, .product__title, [class*="title"]', el => el.innerText.trim()).catch(() => null);
        } catch {}
        
        // Try primary selector first
        try {
            await page.waitForSelector(selectors[0], { state: "attached", timeout: 10000 });
            price = await page.$eval(selectors[0], el => el.innerText.trim());
        } catch (error) {
            // Try alternatives
            for (const selector of selectors.slice(1)) {
                try {
                    price = await page.$eval(selector, el => el.innerText.trim());
                    if (price) break;
                } catch {}
            }
        }
        
        if (!price) {
            throw new Error('Price not found on Vijay Sales page');
        }
        
        return { price: price.trim(), title: title || '' };
    } catch (err) {
        throw new Error(`Vijay Sales scraping failed: ${err.message}`);
    }
}

// Main scraping function
export async function scrapeProduct(productUrl, site = null) {
    const browser = await chromium.launch({ headless: true });
    
    // Create context with user agent to avoid bot detection
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    
    try {
        // Detect site if not provided
        if (!site) {
            site = detectSite(productUrl);
        }
        
        if (!site) {
            throw new Error('Unable to detect site from URL');
        }
        
        console.log(`Scraping ${site} product: ${productUrl}`);
        
        let result;
        switch (site.toLowerCase()) {
            case 'amazon':
                result = await scrapeAmazon(page, productUrl);
                break;
            case 'flipkart':
                result = await scrapeFlipkart(page, productUrl);
                break;
            case 'vijaysales':
                result = await scrapeVijaySales(page, productUrl);
                break;
            default:
                throw new Error(`Unsupported site: ${site}`);
        }
        
        console.log(`Price found: ${result.price}`);
        if (result.title) {
            console.log(`Title: ${result.title}`);
        }
        
        return result;
    } catch (err) {
        console.error(`Scraping error for ${productUrl}:`, err.message);
        throw err;
    } finally {
        await context.close().catch(() => {});
        await browser.close().catch(() => {});
    }
}

// Scrape all products from database
export async function scrapeAllProducts() {
    const db = loadDB();
    const products = db.products || [];
    
    if (products.length === 0) {
        console.log('No products to scrape');
        return;
    }
    
    console.log(`Starting to scrape ${products.length} product(s)...`);
    
    for (const product of products) {
        try {
            const result = await scrapeProduct(product.url, product.site);
            
            // Update product title if we got one
            if (result.title && !product.title) {
                product.title = result.title;
            }
            
            // Check previous price
            const previousEntry = product.history[product.history.length - 1];
            
            // Save only if different
            if (!previousEntry || previousEntry.price !== result.price) {
                product.history.push({
                    price: result.price,
                    timestamp: new Date().toISOString()
                });
                
                saveDB(db);
                console.log(`✓ Updated price for: ${product.title || product.url}`);
                
                // Send alert if price changed
                if (previousEntry) {
                    try {
                        await sendAlert(`
Price Update!
Site: ${product.site || 'Unknown'}
Product: ${product.title || product.url}
Old Price: ${previousEntry.price}
New Price: ${result.price}
URL: ${product.url}
                        `);
                    } catch (err) {
                        console.error("Alert failed:", err.message);
                    }
                }
            } else {
                console.log(`- No price change for: ${product.title || product.url}`);
            }
            
            // Wait a bit between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (err) {
            console.error(`Failed to scrape ${product.url}:`, err.message);
            // Continue with next product
        }
    }
    
    console.log('Scraping completed');
}

// Legacy function for backward compatibility
export default async function scrapeVijayStore() {
    const db = loadDB();
    const vijayProducts = db.products.filter(p => 
        p.site === 'vijaysales' || p.url.includes('vijaysales.com')
    );
    
    if (vijayProducts.length > 0) {
        await scrapeAllProducts();
    } else {
        console.log('No Vijay Sales products to scrape');
    }
}
