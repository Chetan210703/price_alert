import express from "express";
import cors from "cors";
import { loadDB } from "./database.js";

const app = express();
app.use(cors());

app.get("/api/products", (req, res) => {
    const db = loadDB();
    res.json(db.products);
});

app.listen(3001, () => console.log("API running on port 3001"));
