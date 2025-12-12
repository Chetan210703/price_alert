import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
  } from "recharts";
  
  export default function PriceCard({ product }) {
    const history = product.history || [];
  
    return (
      <div style={{
        border: "1px solid #ddd",
        padding: 15,
        borderRadius: 10,
        marginBottom: 20
      }}>
        <h2>{product.title || "Unknown Product"}</h2>
        <p><strong>Current Price:</strong> ₹{product.price}</p>
        <p><strong>Website:</strong> {product.site}</p>
  
        <h3>Price History</h3>
  
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={history}>
            <XAxis dataKey="timestamp" hide />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="price" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
  