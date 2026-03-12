# MongoDB Atlas Connection String Fix

## Issue
Your connection string appears to have a formatting problem. The cluster name shows `123@cluster0.lckwie0.mongodb.net` which indicates the password parsing is incorrect.

## Solution

### If your password contains special characters:
Special characters in passwords must be **URL-encoded**. Common characters that need encoding:

- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`
- `?` → `%3F`
- `/` → `%2F`

### Example:
If your password is `myp@ss#word`, your connection string should be:
```
MONGODB_URI=mongodb+srv://username:myp%40ss%23word@cluster0.lckwie0.mongodb.net/
```

### Steps to Fix:

1. **Get your connection string from MongoDB Atlas:**
   - Go to MongoDB Atlas → Clusters
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

2. **If your password has special characters:**
   - Use an online URL encoder: https://www.urlencoder.org/
   - Encode only the password part
   - Replace the password in the connection string

3. **Or create a new database user with a simple password:**
   - Go to MongoDB Atlas → Database Access
   - Create a new user
   - Use a password without special characters (letters, numbers only)
   - Update your connection string with the new credentials

4. **Update your `.env` file:**
   ```env
   MONGODB_URI=mongodb+srv://username:encodedpassword@cluster0.lckwie0.mongodb.net/
   DB_NAME=pricealert
   ```

5. **Test again:**
   ```bash
   cd backend
   npm run test-db
   ```

## Quick Fix - Create New User

If encoding is complicated, create a new database user:

1. MongoDB Atlas → Database Access → Add New Database User
2. Username: `pricealert` (or any name)
3. Password: Use "Autogenerate Secure Password" or create a simple one (letters + numbers only)
4. Database User Privileges: "Read and write to any database"
5. Copy the new connection string
6. Update your `.env` file

## Verify Your Connection String Format

Correct format:
```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/
```

Your cluster should be: `cluster0.lckwie0.mongodb.net` (without any `@` or numbers before it)

