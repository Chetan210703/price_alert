import scrapeVijayStore from './scraper.js';

async function scheduleScraper() {
    while (true) {
        console.log('Scraping Vijay Sales...');
        try {
            await scrapeVijayStore();
        } catch (error) {
            console.error('Error in scheduleScraper:', error.message);
        }
        console.log('Scraping completed');
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
}
scheduleScraper();  