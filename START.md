# Quick Start Guide

## Step 1: Start Backend Server

Open Terminal 1:
```bash
cd backend
npm run dev
```

You should see: `API running on port 3001`

## Step 2: Start Frontend Server

Open Terminal 2:
```bash
cd frontend
npm run dev
```

You should see: `Local: http://localhost:5173`

## Step 3: Open Browser

Navigate to: **http://localhost:5173**

---

## Troubleshooting Blank Page

If you see a blank page:

1. **Check Browser Console** (F12 → Console tab)
   - Look for any red error messages
   - Share the error if you see one

2. **Verify Backend is Running**
   - Check Terminal 1 - should show "API running on port 3001"
   - Try visiting: http://localhost:3001/api/products
   - Should return JSON data

3. **Verify Frontend is Running**
   - Check Terminal 2 - should show the Vite dev server URL
   - The page should automatically open

4. **Clear Browser Cache**
   - Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac) to hard refresh

5. **Check Ports**
   - Make sure ports 3001 and 5173 are not used by other apps
   - If busy, kill the process or change ports

## Common Issues

- **CORS Error**: Make sure backend is running first
- **Network Error**: Check if backend is accessible at http://localhost:3001
- **Blank Page**: Check browser console for JavaScript errors

