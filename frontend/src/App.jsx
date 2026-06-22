import { useEffect, useState } from "react";
import PriceCard from "./components/PriceCard";
import { API_BASE } from "./config.js";

export default function App() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/products`)
      .then(res => res.json())
      .then(data => setProducts(data));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Price Tracker Dashboard</h1>

      {products.length === 0 ? (
        <p>Loading...</p>
      ) : (
        products.map((p, index) => (
          <PriceCard key={index} product={p} />
        ))
      )}
    </div>
  );
}
