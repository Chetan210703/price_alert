import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnv = path.resolve(__dirname, "../../.env");
const backendEnv = path.resolve(__dirname, "../.env");

dotenv.config({ path: rootEnv });
dotenv.config({ path: backendEnv, override: false });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'price-alert';

console.log('Environment Variables Check:\n');
console.log('MONGODB_URI:', MONGODB_URI ? `${MONGODB_URI.substring(0, 20)}...` : '❌ NOT SET');
console.log('DB_NAME:', DB_NAME);

if (!MONGODB_URI) {
    console.log('\n❌ MONGODB_URI is not set in your .env file!');
    console.log('\nPlease add to your .env file:');
    console.log('MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/');
} else {
    // Check format
    if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
        console.log('\n⚠️  Warning: MONGODB_URI should start with mongodb:// or mongodb+srv://');
    }
    
    if (MONGODB_URI.includes('mongodb+srv://')) {
        // Extract username, password, and cluster for validation
        const match = MONGODB_URI.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)/);
        if (match) {
            const username = match[1];
            const password = match[2];
            const cluster = match[3];
            
            console.log('\n✓ Connection string format looks correct');
            console.log('  Username:', username);
            console.log('  Password:', password ? '***' + password.slice(-2) : '❌ MISSING');
            console.log('  Cluster:', cluster);
            
            if (!password || password.length === 0) {
                console.log('\n❌ ERROR: Password is missing in connection string!');
                console.log('   Format should be: mongodb+srv://username:password@cluster.mongodb.net/');
            }
        } else {
            // Try to see what we have
            const simpleMatch = MONGODB_URI.match(/mongodb\+srv:\/\/([^@]+)@([^/]+)/);
            if (simpleMatch) {
                console.log('\n❌ ERROR: Connection string format is incorrect!');
                console.log('   Found:', simpleMatch[1] + '@' + simpleMatch[2]);
                console.log('   Expected: username:password@cluster.mongodb.net');
                console.log('\n   Your connection string should look like:');
                console.log('   mongodb+srv://yourusername:yourpassword@cluster0.lckwie0.mongodb.net/');
            }
        }
    }
}

