# MongoDB Setup Guide

## Overview
The application has been migrated from JSON file storage to MongoDB for better scalability and performance.

## Prerequisites

1. **MongoDB Installation**
   - Option A: Install MongoDB locally
     - Download from [mongodb.com](https://www.mongodb.com/try/download/community)
     - Or use Homebrew: `brew install mongodb-community`
   - Option B: Use MongoDB Atlas (Cloud - Free tier available)
     - Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
     - Create a free cluster
     - Get your connection string

2. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

## Configuration

### Environment Variables

Add to your `.env` file in the backend directory:

```env
# MongoDB Connection String
# For local MongoDB:
MONGODB_URI=mongodb://localhost:27017

# For MongoDB Atlas (replace with your connection string):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/

# Database Name (optional, defaults to 'price-alert')
DB_NAME=price-alert
```

### Local MongoDB Setup

1. **Start MongoDB service:**
   ```bash
   # macOS (with Homebrew)
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   
   # Windows
   # MongoDB should start automatically as a service
   ```

2. **Verify MongoDB is running:**
   ```bash
   mongosh
   # or
   mongo
   ```

### MongoDB Atlas Setup (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier M0)
3. Create a database user
4. Whitelist your IP address (or use `0.0.0.0/0` for development)
5. Get your connection string:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
6. Add to `.env`:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
   ```

## Migration from JSON to MongoDB

If you have existing data in `db.json`, run the migration script:

```bash
cd backend
npm run migrate
```

The migration script is located in `backend/db/migrate-to-mongodb.js`.

This will:
- Read all products and users from `db.json`
- Import them into MongoDB
- Skip duplicates if they already exist
- Keep your original `db.json` file intact

**Note:** The migration script will only run if MongoDB collections are empty to prevent data loss.

## Testing the Connection

Before starting the application, test your MongoDB Atlas connection:

```bash
cd backend
npm run test-db
```

This will:
- Test the connection to MongoDB Atlas
- Show database and collection information
- Display any connection errors with helpful tips

**Common Issues:**
- **Authentication failed**: Check username/password in connection string
- **Connection timeout**: Verify your IP is whitelisted in MongoDB Atlas Network Access
- **ENOTFOUND**: Check your connection string format

## Running the Application

1. **Test your connection first** (recommended):
   ```bash
   cd backend
   npm run test-db
   ```

2. **Start the backend server:**
   ```bash
   npm run dev
   ```

3. The server will automatically:
   - Connect to MongoDB Atlas on startup
   - Create collections if they don't exist
   - Create indexes for better performance
   - Show "✓ Connected to MongoDB" in console if successful

## Database Structure

### Collections

#### `products`
```javascript
{
  url: String (unique, indexed),
  site: String,
  title: String,
  history: [
    {
      price: String,
      couponAvailable: Boolean | null,
      couponText: String | null,
      timestamp: String (ISO date)
    }
  ]
}
```

#### `users`
```javascript
{
  chatId: Number (unique, indexed),
  username: String,
  connectedAt: String (ISO date),
  active: Boolean,
  disconnectedAt: String (ISO date) // optional
}
```

## Troubleshooting

### Connection Errors

**Error: "MongoServerError: connection timed out"**
- Check if MongoDB is running (local) or your IP is whitelisted (Atlas)
- Verify your connection string is correct
- Check firewall settings

**Error: "MongoServerError: authentication failed"**
- Verify username and password in connection string
- Check database user permissions

**Error: "Cannot find module 'mongodb'"**
- Run `npm install` in the backend directory

### Migration Issues

**Migration says "already has data"**
- If you want to re-run migration, clear collections first:
  ```javascript
  // In mongosh or MongoDB Compass
  use price-alert
  db.products.deleteMany({})
  db.users.deleteMany({})
  ```

**Products/Users not appearing after migration**
- Check MongoDB connection string
- Verify data exists in `db.json`
- Check server logs for errors

### Performance

- Indexes are automatically created on `url` (products) and `chatId` (users)
- For large datasets, consider adding additional indexes based on query patterns

## Backup and Restore

### Backup
```bash
# Local MongoDB
mongodump --db=price-alert --out=./backup

# MongoDB Atlas
# Use Atlas UI: Clusters → ... → Download Backup
```

### Restore
```bash
# Local MongoDB
mongorestore --db=price-alert ./backup/price-alert
```

## Next Steps

After setup:
1. Run migration if you have existing data
2. Start the server and verify connection
3. Test adding a product
4. Verify data appears in MongoDB (use MongoDB Compass or mongosh)

## MongoDB Compass (GUI Tool)

For easier database management, install [MongoDB Compass](https://www.mongodb.com/products/compass):
- Visual interface for browsing data
- Query editor
- Index management
- Performance monitoring

