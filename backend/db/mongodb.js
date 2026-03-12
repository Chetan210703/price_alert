import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, "../../.env");
const backendEnv = path.resolve(__dirname, "../.env");
dotenv.config({ path: rootEnv });
dotenv.config({ path: backendEnv, override: false });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'price-alert';

let client = null;
let db = null;

// Connect to MongoDB
export async function connectDB() {
    try {
        if (client && db) {
            return db;
        }

        client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db(DB_NAME);
        
        console.log('✓ Connected to MongoDB');
        
        // Create indexes for better performance
        await db.collection('products').createIndex({ url: 1 }, { unique: true });
        await db.collection('users').createIndex({ chatId: 1 }, { unique: true });
        
        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

// Get database instance
export async function getDB() {
    if (!db) {
        await connectDB();
    }
    return db;
}

// Close MongoDB connection
export async function closeDB() {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log('MongoDB connection closed');
    }
}

// Initialize database with collections
export async function initDB() {
    const database = await getDB();
    
    // Ensure collections exist
    const collections = await database.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    if (!collectionNames.includes('products')) {
        await database.createCollection('products');
        console.log('✓ Created products collection');
    }
    
    if (!collectionNames.includes('users')) {
        await database.createCollection('users');
        console.log('✓ Created users collection');
    }
    
    return database;
}

