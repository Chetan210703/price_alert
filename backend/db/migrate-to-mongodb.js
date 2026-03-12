import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { connectDB, getDB } from './mongodb.js';
import { addProduct, addUser } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// db.json is in the parent directory (backend/)
const dbPath = join(__dirname, '../db.json');

async function migrate() {
    try {
        console.log('Starting migration from JSON to MongoDB...');
        
        // Connect to MongoDB
        await connectDB();
        const db = await getDB();
        
        // Check if db.json exists
        if (!fs.existsSync(dbPath)) {
            console.log('No db.json file found. Nothing to migrate.');
            return;
        }
        
        // Read JSON file
        const jsonData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        
        // Check if collections already have data
        const existingProducts = await db.collection('products').countDocuments();
        const existingUsers = await db.collection('users').countDocuments();
        
        if (existingProducts > 0 || existingUsers > 0) {
            console.log('⚠️  MongoDB already has data. Skipping migration.');
            console.log(`   Products: ${existingProducts}, Users: ${existingUsers}`);
            return;
        }
        
        // Migrate products
        if (jsonData.products && jsonData.products.length > 0) {
            console.log(`Migrating ${jsonData.products.length} products...`);
            for (const product of jsonData.products) {
                try {
                    await addProduct(product);
                    console.log(`  ✓ Migrated: ${product.title || product.url}`);
                } catch (err) {
                    if (err.code === 11000) {
                        console.log(`  - Skipped duplicate: ${product.url}`);
                    } else {
                        console.error(`  ✗ Error migrating ${product.url}:`, err.message);
                    }
                }
            }
        }
        
        // Migrate users
        if (jsonData.users && jsonData.users.length > 0) {
            console.log(`Migrating ${jsonData.users.length} users...`);
            for (const user of jsonData.users) {
                try {
                    await addUser(user);
                    console.log(`  ✓ Migrated user: ${user.username || user.chatId}`);
                } catch (err) {
                    if (err.code === 11000) {
                        console.log(`  - Skipped duplicate user: ${user.chatId}`);
                    } else {
                        console.error(`  ✗ Error migrating user ${user.chatId}:`, err.message);
                    }
                }
            }
        }
        
        console.log('\n✅ Migration completed successfully!');
        console.log('\nNote: Your db.json file is still intact. You can delete it after verifying the migration.');
        
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

migrate();

