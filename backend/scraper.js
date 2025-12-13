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
        
        // Wait for page to load
        await page.waitForTimeout(3000);
        
        // Amazon price selectors (multiple options for different page layouts)
        const selectors = [
            '#corePriceDisplay_desktop_feature_div .a-price-whole',
            '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
            '#priceblock_ourprice',
            '#priceblock_dealprice',
            '.a-price-whole',
            '.a-price .a-offscreen',
            '[data-a-color="price"] .a-offscreen',
            '#apex_desktop .a-price-whole',
            '[class*="a-price-whole"]',
            '[class*="a-price"]',
            'span[class*="a-price"]'
        ];
        
        let price = null;
        let title = null;
        
        // Try to get title with multiple selectors
        const titleSelectors = ['#productTitle', 'h1.a-size-large', 'h1', '[data-automation-id="title"]'];
        for (const selector of titleSelectors) {
            try {
                title = await page.$eval(selector, el => el.innerText.trim()).catch(() => null);
                if (title) break;
            } catch {}
        }
        
        // Try each selector with wait
        for (const selector of selectors) {
            try {
                await page.waitForSelector(selector, { timeout: 2000 }).catch(() => {});
                const element = await page.$(selector);
                if (element) {
                    // For .a-offscreen, get the text content
                    if (selector.includes('.a-offscreen')) {
                        price = await page.$eval(selector, el => {
                            return el.getAttribute('aria-label') || el.textContent.trim() || el.innerText.trim();
                        }).catch(() => null);
                    } else {
                        // For .a-price-whole, combine with currency symbol
                        const wholePart = await page.$eval(selector, el => el.innerText.trim()).catch(() => '');
                        const fractionSelector = selector.replace('-whole', '-fraction');
                        const fractionPart = await page.$eval(fractionSelector, el => el.innerText.trim()).catch(() => '');
                        price = wholePart + (fractionPart ? '.' + fractionPart : '');
                    }
                    
                    // Format price with ₹ symbol
                    if (price && !price.includes('₹') && !price.includes('$') && !price.includes('€')) {
                        // Extract numbers and add ₹
                        const numbers = price.replace(/[^\d.]/g, '');
                        if (numbers) {
                            price = '₹' + numbers;
                        }
                    }
                    
                    if (price && price.match(/[₹0-9,]/)) break;
                }
            } catch (e) {
                continue;
            }
        }
        
        // If still no price, try text-based search
        if (!price) {
            try {
                const pageContent = await page.textContent('body');
                const priceMatch = pageContent.match(/₹[\d,]+/);
                if (priceMatch) {
                    price = priceMatch[0];
                }
            } catch {}
        }
        
        if (!price) {
            // Debug: log page title and URL
            const pageTitle = await page.title().catch(() => 'Unknown');
            console.log(`Amazon debug - Page title: ${pageTitle}, URL: ${page.url()}`);
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
        
        // Wait for page to load
        await page.waitForTimeout(3000);
        
        // Flipkart price selectors (updated and comprehensive)
        const selectors = [
            '._30jeq3._16Jk6d',
            '._30jeq3',
            '._16Jk6d',
            '[class*="_30jeq3"]',
            '.dyC4hf ._30jeq3',
            '._25b18c ._30jeq3',
            '[class*="price"]',
            'span[class*="price"]',
            'div[class*="price"]',
            '.a-price-whole',
            '[data-id*="price"]'
        ];
        
        let price = null;
        let title = null;
        
        // Try to get title with multiple selectors
        const titleSelectors = [
            'h1[class*="B_NuCI"]',
            '.B_NuCI',
            'h1 span',
            'h1',
            '[data-id="productTitle"]',
            '.product-title'
        ];
        
        for (const selector of titleSelectors) {
            try {
                title = await page.$eval(selector, el => el.innerText.trim()).catch(() => null);
                if (title) break;
            } catch {}
        }
        
        // Try each price selector with wait
        for (const selector of selectors) {
            try {
                await page.waitForSelector(selector, { timeout: 2000 }).catch(() => {});
                const element = await page.$(selector);
                if (element) {
                    price = await page.$eval(selector, el => {
                        const text = el.innerText.trim();
                        // Look for price pattern (₹ or numbers)
                        if (text.match(/[₹0-9,]/)) {
                            return text;
                        }
                        return null;
                    }).catch(() => null);
                    if (price) break;
                }
            } catch (e) {
                continue;
            }
        }
        
        // If still no price, try text-based search
        if (!price) {
            try {
                const pageContent = await page.textContent('body');
                const priceMatch = pageContent.match(/₹[\d,]+/);
                if (priceMatch) {
                    price = priceMatch[0];
                }
            } catch {}
        }
        
        if (!price) {
            // Debug: log page title and URL
            const pageTitle = await page.title().catch(() => 'Unknown');
            console.log(`Flipkart debug - Page title: ${pageTitle}, URL: ${page.url()}`);
            throw new Error('Price not found on Flipkart page');
        }
        
        // Clean price - ensure it has ₹ symbol
        if (!price.includes('₹')) {
            price = '₹' + price.replace(/[^\d,]/g, '');
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
        
        // Wait for page to load
        await page.waitForTimeout(3000);
        
        const selectors = [
            '.product__price--price',
            '.product-price',
            '[class*="product__price"]',
            '[class*="price"]',
            '.price',
            '.product-price-value',
            '[data-price]',
            'span[class*="price"]',
            'div[class*="price"]'
        ];
        
        let price = null;
        let title = null;
        
        // Try to get title with multiple selectors
        const titleSelectors = [
            'h1',
            '.product__title',
            '[class*="product__title"]',
            '[class*="title"]',
            '.product-title',
            'h1.product-title'
        ];
        
        for (const selector of titleSelectors) {
            try {
                title = await page.$eval(selector, el => el.innerText.trim()).catch(() => null);
                if (title) break;
            } catch {}
        }
        
        // Try each selector with wait
        for (const selector of selectors) {
            try {
                await page.waitForSelector(selector, { timeout: 2000 }).catch(() => {});
                const element = await page.$(selector);
                if (element) {
                    price = await page.$eval(selector, el => {
                        const text = el.innerText.trim();
                        // Look for price pattern (₹ or numbers)
                        if (text.match(/[₹0-9,]/)) {
                            return text;
                        }
                        return null;
                    }).catch(() => null);
                    if (price) break;
                }
            } catch (e) {
                continue;
            }
        }
        
        // If still no price, try text-based search
        if (!price) {
            try {
                const pageContent = await page.textContent('body');
                const priceMatch = pageContent.match(/₹[\d,]+/);
                if (priceMatch) {
                    price = priceMatch[0];
                }
            } catch {}
        }
        
        // Try data attributes
        if (!price) {
            try {
                const priceElement = await page.$('[data-price]');
                if (priceElement) {
                    price = await priceElement.getAttribute('data-price');
                    if (price && !price.includes('₹')) {
                        price = '₹' + price;
                    }
                }
            } catch {}
        }
        
        if (!price) {
            // Debug: log page title and URL
            const pageTitle = await page.title().catch(() => 'Unknown');
            console.log(`Vijay Sales debug - Page title: ${pageTitle}, URL: ${page.url()}`);
            throw new Error('Price not found on Vijay Sales page');
        }
        
        // Clean price - ensure it has ₹ symbol
        if (!price.includes('₹')) {
            price = '₹' + price.replace(/[^\d,]/g, '');
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
        // Validate URL
        if (!product.url || product.url.includes('...') || product.url.length < 20) {
            console.error(`⚠ Skipping invalid URL: ${product.url}`);
            continue;
        }
        
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
                console.log(`✓ Updated price for: ${product.title || product.url} - ${result.price}`);
                
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
                } else {
                    console.log(`  Initial price recorded: ${result.price}`);
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
