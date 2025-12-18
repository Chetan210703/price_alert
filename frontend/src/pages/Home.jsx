import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState(null);

  const fetchProducts = () => {
    fetch("http://localhost:3001/api/products")
      .then(res => {
        if (!res.ok) {
          throw new Error(`Backend returned ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setProducts(data || []);
        setLoading(false);
        setError(null);
      })
      .catch(err => {
        console.error("Error fetching products:", err);
        setError("Cannot connect to backend. Make sure the backend server is running on port 3001.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleManualScrape = async () => {
    setScraping(true);
    setScrapeMessage(null);
    try {
      const response = await fetch("http://localhost:3001/api/scrape", {
        method: "POST",
      });
      const data = await response.json();
      setScrapeMessage(data.message || "Scraping started!");
      
      // Wait a bit then refresh products
      setTimeout(() => {
        fetchProducts();
        setScrapeMessage("Scraping in progress... Check back in a moment!");
      }, 2000);
    } catch (err) {
      setScrapeMessage("Failed to start scraping: " + err.message);
    } finally {
      setScraping(false);
    }
  };

  const getLatestPrice = (history) => {
    if (!history || history.length === 0) return "N/A";
    return history[history.length - 1]?.price || "N/A";
  };

  const getLatestCouponInfo = (history) => {
    if (!history || history.length === 0) return { hasCoupon: false, text: null };
    const latest = history[history.length - 1];

    const hasCoupon =
      typeof latest.couponAvailable === "boolean" ? latest.couponAvailable : false;

    return {
      hasCoupon,
      text: hasCoupon ? latest.couponText || "Coupon available" : null,
    };
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "40px 20px"
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "40px",
          flexWrap: "wrap",
          gap: "20px"
        }}>
          <h1 style={{
            color: "#ffffff",
            fontSize: "2.5rem",
            fontWeight: "700",
            margin: 0,
            textShadow: "0 2px 10px rgba(0,0,0,0.2)"
          }}>
            Price Tracker Dashboard
          </h1>
          <div style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap"
          }}>
            <button
              onClick={handleManualScrape}
              disabled={scraping || products.length === 0}
              style={{
                background: scraping ? "#cccccc" : "#4caf50",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "12px",
                border: "none",
                fontWeight: "600",
                fontSize: "1rem",
                cursor: scraping || products.length === 0 ? "not-allowed" : "pointer",
                boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                transition: "transform 0.2s, box-shadow 0.2s",
                opacity: products.length === 0 ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!scraping && products.length > 0) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!scraping && products.length > 0) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
                }
              }}
            >
              {scraping ? "Scraping..." : "🔄 Update Prices"}
            </button>
            <Link
              to="/add"
              style={{
                background: "#ffffff",
                color: "#667eea",
                padding: "12px 24px",
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "1rem",
                boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                transition: "transform 0.2s, box-shadow 0.2s",
                display: "inline-block"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
              }}
            >
              + Add New Product
            </Link>
          </div>
        </div>

        {/* Scrape Message */}
        {scrapeMessage && (
          <div style={{
            background: scraping ? "#fff3cd" : "#d4edda",
            color: scraping ? "#856404" : "#155724",
            padding: "12px 20px",
            borderRadius: "12px",
            marginBottom: "24px",
            border: `2px solid ${scraping ? "#ffc107" : "#28a745"}`,
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span>{scraping ? "⏳" : "✓"}</span>
            <span>{scrapeMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            background: "#ffebee",
            color: "#c62828",
            padding: "20px",
            borderRadius: "12px",
            marginBottom: "24px",
            border: "2px solid #f44336"
          }}>
            <p style={{
              margin: "0 0 8px 0",
              fontWeight: "600",
              fontSize: "1.1rem"
            }}>
              ⚠️ Connection Error
            </p>
            <p style={{
              margin: 0,
              fontSize: "0.95rem"
            }}>
              {error}
            </p>
            <p style={{
              margin: "12px 0 0 0",
              fontSize: "0.85rem",
              opacity: 0.8
            }}>
              Make sure to run: <code style={{background: "#fff", padding: "2px 6px", borderRadius: "4px"}}>cd backend && npm run dev</code>
            </p>
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div style={{
            textAlign: "center",
            color: "#ffffff",
            fontSize: "1.2rem",
            padding: "60px 20px"
          }}>
            Loading products...
          </div>
        ) : error ? null : products.length === 0 ? (
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "60px 20px",
            textAlign: "center",
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)"
          }}>
            <p style={{
              color: "#666",
              fontSize: "1.1rem",
              margin: 0
            }}>
              No products tracked yet. Add your first product to get started!
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "24px"
          }}>
            {products.map(p => {
              const latestCoupon = getLatestCouponInfo(p.history);
              return (
              <div
                key={p.url}
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  padding: "24px",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                  transition: "transform 0.3s, box-shadow 0.3s",
                  cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.2)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.boxShadow = "0 15px 50px rgba(0,0,0,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 10px 40px rgba(0,0,0,0.15)";
                }}
              >
                <h3 style={{
                  color: "#333",
                  fontSize: "1.3rem",
                  fontWeight: "600",
                  margin: "0 0 12px 0",
                  lineHeight: "1.4",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical"
                }}>
                  {p.title || "Untitled Product"}
                </h3>
                
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "16px"
                }}>
                  <span style={{
                    background: "#f0f0f0",
                    color: "#666",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "0.85rem",
                    fontWeight: "500"
                  }}>
                    {p.site || "Unknown"}
                  </span>
                </div>

                <div style={{
                  marginBottom: "12px"
                }}>
                  <p style={{
                    color: "#999",
                    fontSize: "0.9rem",
                    margin: "0 0 4px 0",
                    fontWeight: "500"
                  }}>
                    Current Price
                  </p>
                  <p style={{
                    color: "#667eea",
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    margin: 0
                  }}>
                    {getLatestPrice(p.history)}
                  </p>
                </div>

                {/* Coupon badge (if any) */}
                {latestCoupon.hasCoupon && (
                  <div style={{
                    marginBottom: "20px",
                    padding: "6px 10px",
                    borderRadius: "999px",
                    background: "rgba(76, 175, 80, 0.08)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.85rem",
                    color: "#2e7d32",
                    fontWeight: "500"
                  }}>
                    <span>🏷️ Coupon</span>
                    <span style={{ opacity: 0.9 }}>{latestCoupon.text}</span>
                  </div>
                )}

                <Link
                  to={`/product?url=${encodeURIComponent(p.url)}`}
                  style={{
                    display: "block",
                    textAlign: "center",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "#ffffff",
                    padding: "12px 20px",
                    borderRadius: "10px",
                    textDecoration: "none",
                    fontWeight: "600",
                    fontSize: "0.95rem",
                    transition: "opacity 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  View Details →
                </Link>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
}
