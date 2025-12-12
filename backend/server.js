import express from "express";
import cors from "cors";
import { loadDB } from "./database.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/products", (req, res) => {
    const db = loadDB();
    res.json(db.products);
});

//single product route
app.get("/api/products/:url", (req, res) => {
    const url = req.params.url;
    const db = loadDB();
    const product = db.products.find(p => p.url === url);
    res.json(product || {});
});
// add product route
app.post("/api/add-product", (req, res) => {
    const { url, site } = req.body;
    if (!url) {
        return res.status(400).json({ error: "URL is required" });
    }
    const db = loadDB();
    const product = db.products.find(p => p.url === url);
    if (product) return res.status(400).json({ error: "Product already exists" });
    db.products.push({ url, site, title: "", history: [] });
    saveDB(db);
    res.json({ message: "Product added successfully" });
});
app.listen(3001, () => console.log("API running on port 3001"));
