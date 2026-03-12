import { connectDB, closeDB } from './mongodb.js';

async function testConnection() {
    try {
        console.log('Testing MongoDB Atlas connection...');
        console.log('Connecting...\n');
        
        const db = await connectDB();
        
        // Test query
        const collections = await db.listCollections().toArray();
        console.log('✓ Connection successful!');
        console.log(`✓ Database: ${db.databaseName}`);
        console.log(`✓ Collections found: ${collections.length}`);
        
        if (collections.length > 0) {
            console.log('\nCollections:');
            collections.forEach(col => {
                console.log(`  - ${col.name}`);
            });
        }
        
        // Test collections
        const productsCount = await db.collection('products').countDocuments();
        const usersCount = await db.collection('users').countDocuments();
        
        console.log(`\n✓ Products: ${productsCount} documents`);
        console.log(`✓ Users: ${usersCount} documents`);
        
        console.log('\n✅ MongoDB Atlas connection test passed!');
        
    } catch (error) {
        console.error('\nConnection test failed!');
        console.error('Error:', error.message);
        
        if (error.message.includes('authentication')) {
            console.error('\n Tip: Check your MongoDB Atlas username and password in the connection string.');
        } else if (error.message.includes('timeout') || error.message.includes('ENOTFOUND')) {
            console.error('\n Tip: Check your network connection and MongoDB Atlas cluster status.');
            console.error('Tip: Verify your IP address is whitelisted in MongoDB Atlas Network Access.');
        } else if (error.message.includes('MONGODB_URI')) {
            console.error('\n Tip: Make sure MONGODB_URI is set in your .env file.');
        }
        
        process.exit(1);
    } finally {
        await closeDB();
        process.exit(0);
    }
}

testConnection();

