import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

export default function ProductDetails() {
  const [searchParams] = useSearchParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const url = searchParams.get("url");

  useEffect(() => {
    if (!url) {
      setError("No product URL provided");
      setLoading(false);
      return;
    }

    // Fetch all products and find the one matching the URL
    fetch("http://localhost:3001/api/products")
      .then(res => res.json())
      .then(data => {
        const foundProduct = data.find(p => p.url === url);
        if (foundProduct) {
          setProduct(foundProduct);
        } else {
          setError("Product not found");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching product:", err);
        setError("Failed to load product");
        setLoading(false);
      });
  }, [url]);

  // Format price history for chart
  const formatChartData = (history) => {
    if (!history || history.length === 0) return [];
    
    return history.map((item, index) => {
      const date = new Date(item.timestamp);
      const priceValue = parseFloat(item.price?.replace(/[₹,]/g, "") || 0);
      
      return {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullDate: date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        price: priceValue,
        priceFormatted: item.price,
        index: index + 1
      };
    });
  };

  const chartData = product ? formatChartData(product.history) : [];
  const latestEntry = product?.history?.[product.history.length - 1] || null;
  const latestPrice = latestEntry?.price || "N/A";
  const firstPrice = product?.history?.[0]?.price || "N/A";

  const latestCouponAvailable =
    typeof latestEntry?.couponAvailable === "boolean"
      ? latestEntry.couponAvailable
      : false;
  const latestCouponText =
    latestCouponAvailable && latestEntry?.couponText
      ? latestEntry.couponText
      : latestCouponAvailable
      ? "Coupon available"
      : null;

  // Calculate price change
  const getPriceChange = () => {
    if (!product?.history || product.history.length < 2) return null;
    const first = parseFloat(product.history[0].price?.replace(/[₹,]/g, "") || 0);
    const last = parseFloat(product.history[product.history.length - 1].price?.replace(/[₹,]/g, "") || 0);
    const change = last - first;
    const percentChange = first !== 0 ? ((change / first) * 100).toFixed(2) : 0;
    return { change, percentChange, isPositive: change >= 0 };
  };

  const priceChange = getPriceChange();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          color: "#ffffff",
          fontSize: "1.2rem"
        }}>
          Loading product details...
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}>
        <div style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "40px",
          textAlign: "center",
          boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
          maxWidth: "500px"
        }}>
          <h2 style={{ color: "#333", marginBottom: "16px" }}>Error</h2>
          <p style={{ color: "#666", marginBottom: "24px" }}>{error || "Product not found"}</p>
          <Link
            to="/"
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: "600"
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

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
        {/* Back Button */}
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "#ffffff",
            textDecoration: "none",
            marginBottom: "30px",
            fontSize: "1rem",
            fontWeight: "500",
            opacity: 0.9,
            transition: "opacity 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "0.9"}
        >
          ← Back to Dashboard
        </Link>

        {/* Main Card */}
        <div style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "40px",
          boxShadow: "0 15px 50px rgba(0,0,0,0.2)"
        }}>
          {/* Product Header */}
          <div style={{
            marginBottom: "40px",
            paddingBottom: "30px",
            borderBottom: "2px solid #f0f0f0"
          }}>
            <h1 style={{
              color: "#333",
              fontSize: "2rem",
              fontWeight: "700",
              margin: "0 0 16px 0",
              lineHeight: "1.3"
            }}>
              {product.title || "Untitled Product"}
            </h1>
            
            <div style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              alignItems: "center"
            }}>
              <span style={{
                background: "#f0f0f0",
                color: "#666",
                padding: "6px 16px",
                borderRadius: "20px",
                fontSize: "0.9rem",
                fontWeight: "500"
              }}>
                {product.site || "Unknown Site"}
              </span>
              
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#667eea",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                View on Site →
              </a>
            </div>
          </div>

          {/* Price Stats */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
            marginBottom: "40px"
          }}>
            <div style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "16px",
              padding: "24px",
              color: "#ffffff"
            }}>
              <p style={{
                margin: "0 0 8px 0",
                fontSize: "0.9rem",
                opacity: 0.9
              }}>
                Current Price
              </p>
              <p style={{
                margin: 0,
                fontSize: "2rem",
                fontWeight: "700"
              }}>
                {latestPrice}
              </p>
            </div>

            <div style={{
              background: "#f8f9fa",
              borderRadius: "16px",
              padding: "24px"
            }}>
              <p style={{
                margin: "0 0 8px 0",
                fontSize: "0.9rem",
                color: "#666"
              }}>
                Initial Price
              </p>
              <p style={{
                margin: 0,
                fontSize: "2rem",
                fontWeight: "700",
                color: "#333"
              }}>
                {firstPrice}
              </p>
            </div>

            {priceChange && (
              <div style={{
                background: priceChange.isPositive ? "#e8f5e9" : "#ffebee",
                borderRadius: "16px",
                padding: "24px"
              }}>
                <p style={{
                  margin: "0 0 8px 0",
                  fontSize: "0.9rem",
                  color: "#666"
                }}>
                  Price Change
                </p>
                <p style={{
                  margin: 0,
                  fontSize: "2rem",
                  fontWeight: "700",
                  color: priceChange.isPositive ? "#4caf50" : "#f44336"
                }}>
                  {priceChange.isPositive ? "+" : ""}{priceChange.change.toFixed(0)}
                  <span style={{ fontSize: "1rem", marginLeft: "4px" }}>
                    ({priceChange.isPositive ? "+" : ""}{priceChange.percentChange}%)
                  </span>
                </p>
              </div>
            )}

            <div style={{
              background: "#f8f9fa",
              borderRadius: "16px",
              padding: "24px"
            }}>
              <p style={{
                margin: "0 0 8px 0",
                fontSize: "0.9rem",
                color: "#666"
              }}>
                Data Points
              </p>
              <p style={{
                margin: 0,
                fontSize: "2rem",
                fontWeight: "700",
                color: "#333"
              }}>
                {product.history?.length || 0}
              </p>
            </div>

            {/* Coupon status card */}
            <div style={{
              background: latestCouponAvailable ? "#e8f5e9" : "#f8f9fa",
              borderRadius: "16px",
              padding: "24px"
            }}>
              <p style={{
                margin: "0 0 8px 0",
                fontSize: "0.9rem",
                color: "#666"
              }}>
                Coupon Status
              </p>
              <p style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: "600",
                color: latestCouponAvailable ? "#2e7d32" : "#999"
              }}>
                {latestCouponAvailable ? "Coupon available" : "No coupon detected"}
              </p>
              {latestCouponText && (
                <p style={{
                  margin: "6px 0 0 0",
                  fontSize: "0.9rem",
                  color: "#555"
                }}>
                  {latestCouponText}
                </p>
              )}
            </div>
          </div>

          {/* Price History Chart */}
          <div style={{
            marginTop: "40px"
          }}>
            <h2 style={{
              color: "#333",
              fontSize: "1.5rem",
              fontWeight: "600",
              marginBottom: "24px"
            }}>
              Price History
            </h2>

            {chartData.length === 0 ? (
              <div style={{
                background: "#f8f9fa",
                borderRadius: "12px",
                padding: "60px 20px",
                textAlign: "center"
              }}>
                <p style={{
                  color: "#666",
                  fontSize: "1rem",
                  margin: 0
                }}>
                  No price history available yet
                </p>
              </div>
            ) : (
              <div style={{
                background: "#f8f9fa",
                borderRadius: "12px",
                padding: "24px"
              }}>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="date"
                      stroke="#666"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      stroke="#666"
                      style={{ fontSize: "12px" }}
                      tickFormatter={(value) => `₹${value.toLocaleString()}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#ffffff",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                      }}
                      formatter={(value, name) => [
                        `₹${value.toLocaleString()}`,
                        "Price"
                      ]}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.fullDate;
                        }
                        return label;
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#667eea"
                      strokeWidth={3}
                      dot={{ fill: "#667eea", r: 5 }}
                      activeDot={{ r: 8 }}
                      name="Price"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Price History Table */}
          {product.history && product.history.length > 0 && (
            <div style={{
              marginTop: "40px"
            }}>
              <h2 style={{
                color: "#333",
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "24px"
              }}>
                Price History Details
              </h2>
              <div style={{
                overflowX: "auto",
                borderRadius: "12px",
                border: "1px solid #e0e0e0"
              }}>
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  background: "#ffffff"
                }}>
                  <thead>
                    <tr style={{
                      background: "#f8f9fa",
                      borderBottom: "2px solid #e0e0e0"
                    }}>
                      <th style={{
                        padding: "16px",
                        textAlign: "left",
                        color: "#666",
                        fontWeight: "600",
                        fontSize: "0.9rem"
                      }}>
                        Date
                      </th>
                      <th style={{
                        padding: "16px",
                        textAlign: "right",
                        color: "#666",
                        fontWeight: "600",
                        fontSize: "0.9rem"
                      }}>
                        Price
                      </th>
                      <th style={{
                        padding: "16px",
                        textAlign: "left",
                        color: "#666",
                        fontWeight: "600",
                        fontSize: "0.9rem"
                      }}>
                        Coupon
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...product.history].reverse().map((item, index) => {
                      const date = new Date(item.timestamp);
                      return (
                        <tr
                          key={index}
                          style={{
                            borderBottom: "1px solid #f0f0f0",
                            transition: "background 0.2s"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#f8f9fa"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
                        >
                          <td style={{
                            padding: "16px",
                            color: "#333",
                            fontSize: "0.95rem"
                          }}>
                            {date.toLocaleString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </td>
                          <td style={{
                            padding: "16px",
                            textAlign: "right",
                            color: "#667eea",
                            fontWeight: "600",
                            fontSize: "1rem"
                          }}>
                            {item.price}
                          </td>
                          <td style={{
                            padding: "16px",
                            color: "#333",
                            fontSize: "0.9rem"
                          }}>
                            {typeof item.couponAvailable === "boolean"
                              ? item.couponAvailable
                                ? item.couponText || "Coupon available"
                                : "No coupon"
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

