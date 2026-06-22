import { useState } from "react";
import { API_BASE } from "../config.js";

const SUGGESTIONS = [
  "What's the price trend?",
  "Is now a good time to buy?",
  "Summarize the price history",
];

export default function PriceChat({ productUrl, productTitle }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Ask me about this product's price trend, whether to buy now, or coupon patterns.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, productUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: err.message || "Something went wrong. Please try again.",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div
      style={{
        marginTop: "40px",
        borderRadius: "16px",
        border: "1px solid #e0e0e0",
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid #e0e0e0",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#ffffff",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>
          Price Trend Assistant
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: "0.85rem", opacity: 0.9 }}>
          Powered by Google Gemini · {productTitle || "Product"}
        </p>
      </div>

      <div
        style={{
          height: "320px",
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          background: "#fafafa",
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              padding: "10px 14px",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.isError ? "#fff5f5" : msg.role === "user" ? "#667eea" : "#ffffff",
              color: msg.isError ? "#b42318" : msg.role === "user" ? "#ffffff" : "#333",
              border: msg.isError
                ? "1px solid #fecdca"
                : msg.role === "assistant"
                  ? "1px solid #e8e8e8"
                  : "none",
              fontSize: "0.95rem",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {msg.isError ? `⚠ ${msg.text}` : msg.text}
          </div>
        ))}
        {loading && (
          <div style={{ color: "#666", fontSize: "0.9rem", fontStyle: "italic" }}>
            Analyzing price data...
          </div>
        )}
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid #e0e0e0", background: "#fff" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sendMessage(s)}
              disabled={loading}
              style={{
                padding: "6px 12px",
                borderRadius: "20px",
                border: "1px solid #667eea",
                background: "#fff",
                color: "#667eea",
                fontSize: "0.8rem",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about price trends..."
            disabled={loading}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "10px",
              border: "1px solid #ddd",
              fontSize: "0.95rem",
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: "12px 20px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "#fff",
              fontWeight: "600",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              opacity: loading || !input.trim() ? 0.6 : 1,
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
