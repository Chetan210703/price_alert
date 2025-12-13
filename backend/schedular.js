import { scrapeAllProducts } from './scraper.js';

async function scheduleScraper() {
    console.log('Price scraper scheduler started');
    
    // Run immediately on startup
    console.log('Running initial scrape...');
    try {
        await scrapeAllProducts();
    } catch (error) {
        console.error('Error in initial scrape:', error.message);
    }
    
    // Then run every 10 minutes
    while (true) {
        console.log('Waiting 10 minutes before next scrape cycle...');
        await new Promise(resolve => setTimeout(resolve, 600000)); // 10 minutes
        
        console.log('Starting scheduled scraping...');
        try {
            await scrapeAllProducts();
        } catch (error) {
            console.error('Error in scheduleScraper:', error.message);
        }
        console.log('Scraping cycle completed.');
    }
}

// Start the scheduler
scheduleScraper();  