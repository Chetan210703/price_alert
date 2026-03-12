import { getDB, initDB } from './mongodb.js';

// Initialize database on import
let dbInitialized = false;

async function ensureDB() {
    if (!dbInitialized) {
        await initDB();
        dbInitialized = true;
    }
    return await getDB();
}

// Products collection operations
export async function loadDB() {
    const db = await ensureDB();
    
    const products = await db.collection('products').find({}).toArray();
    const users = await db.collection('users').find({}).toArray();
    
    // Return in the same format as the old JSON structure for backward compatibility
    return {
        products: products.map(p => {
            // Remove MongoDB _id for compatibility
            const { _id, ...product } = p;
            return product;
        }),
        users: users.map(u => {
            const { _id, ...user } = u;
            return user;
        })
    };
}

export async function saveDB(data) {
    const db = await ensureDB();
    
    // Save products
    if (data.products) {
        for (const product of data.products) {
            await db.collection('products').updateOne(
                { url: product.url },
                { $set: product },
                { upsert: true }
            );
        }
    }
    
    // Save users
    if (data.users) {
        for (const user of data.users) {
            await db.collection('users').updateOne(
                { chatId: user.chatId },
                { $set: user },
                { upsert: true }
            );
        }
    }
}

// Product-specific operations
export async function getAllProducts() {
    const db = await ensureDB();
    const products = await db.collection('products').find({}).toArray();
    return products.map(p => {
        const { _id, ...product } = p;
        return product;
    });
}

export async function getProductByUrl(url) {
    const db = await ensureDB();
    const product = await db.collection('products').findOne({ url });
    if (!product) return null;
    const { _id, ...productData } = product;
    return productData;
}

export async function addProduct(product) {
    const db = await ensureDB();
    const result = await db.collection('products').insertOne(product);
    return result.insertedId;
}

export async function updateProduct(url, updates) {
    const db = await ensureDB();
    const result = await db.collection('products').updateOne(
        { url },
        { $set: updates }
    );
    return result.modifiedCount > 0;
}

export async function addProductHistory(url, historyEntry) {
    const db = await ensureDB();
    const result = await db.collection('products').updateOne(
        { url },
        { $push: { history: historyEntry } }
    );
    return result.modifiedCount > 0;
}

export async function deleteProduct(url) {
    const db = await ensureDB();
    const result = await db.collection('products').deleteOne({ url });
    return result.deletedCount > 0;
}

// User-specific operations
export async function getAllUsers() {
    const db = await ensureDB();
    const users = await db.collection('users').find({}).toArray();
    return users.map(u => {
        const { _id, ...user } = u;
        return user;
    });
}

export async function getUserByChatId(chatId) {
    const db = await ensureDB();
    const user = await db.collection('users').findOne({ chatId });
    if (!user) return null;
    const { _id, ...userData } = user;
    return userData;
}

export async function addUser(user) {
    const db = await ensureDB();
    const result = await db.collection('users').insertOne(user);
    return result.insertedId;
}

export async function updateUser(chatId, updates) {
    const db = await ensureDB();
    const result = await db.collection('users').updateOne(
        { chatId },
        { $set: updates }
    );
    return result.modifiedCount > 0;
}

export async function getActiveUsers() {
    const db = await ensureDB();
    const users = await db.collection('users').find({ active: true }).toArray();
    return users.map(u => {
        const { _id, ...user } = u;
        return user;
    });
}

