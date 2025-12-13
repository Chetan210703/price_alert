# Price Alert Application

A modern price tracking application with a beautiful UI for monitoring product prices across e-commerce sites.

## Prerequisites

- Node.js (v20 or higher recommended)
- npm

## Installation

1. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Install Frontend Dependencies:**
   ```bash
   cd frontend
   npm install
   ```

## Running the Application

You need to run both the backend and frontend servers simultaneously.

### Option 1: Run in Separate Terminals (Recommended)

**Terminal 1 - Backend Server:**
```bash
cd backend
npm start
```
The backend API will run on `http://localhost:3001`

**Terminal 2 - Frontend Server:**
```bash
cd frontend
npm run dev
```
The frontend will run on `http://localhost:5173` (or another port if 5173 is busy)

### Option 2: Run Both from Root Directory

**Terminal 1:**
```bash
cd backend && npm start
```

**Terminal 2:**
```bash
cd frontend && npm run dev
```

## Accessing the Application

Once both servers are running:
- Open your browser and navigate to: `http://localhost:5173` (or the port shown in the terminal)
- The application will be ready to use!

## Features

- ✅ Modern, clean card-based UI design
- ✅ Product listing with current prices
- ✅ Detailed product pages with price history graphs
- ✅ Add new products to track
- ✅ Real-time price tracking (via backend scheduler)

## Project Structure

```
price-alert/
├── backend/
│   ├── server.js          # Express API server
│   ├── database.js        # Database utilities
│   ├── scraper.js         # Web scraping logic
│   └── db.json            # JSON database file
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Home.jsx           # Main dashboard
    │   │   ├── ProductDetails.jsx # Product details with graph
    │   │   └── AddProduct.jsx     # Add product form
    │   └── main.jsx       # React app entry point
    └── package.json
```

## Troubleshooting

- **Port already in use**: If port 3001 or 5173 is busy, you may need to stop other applications using those ports
- **CORS errors**: Make sure the backend is running before starting the frontend
- **Module not found**: Run `npm install` in both backend and frontend directories

