import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function AddProduct() {
  const [url, setUrl] = useState("");
  const [site, setSite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const extractSiteFromUrl = (url) => {
    if (!url) return "";
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      // Remove www. and extract main domain
      const domain = hostname.replace(/^www\./, "");
      // Extract site name (e.g., "vijaysales" from "vijaysales.com")
      const siteName = domain.split(".")[0];
      return siteName || "";
    } catch (e) {
      return "";
    }
  };

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    
    // Auto-detect site from URL
    if (newUrl && !site) {
      const detectedSite = extractSiteFromUrl(newUrl);
      if (detectedSite) {
        setSite(detectedSite);
      }
    }
    
    // Clear errors when user types
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!url.trim()) {
      setError("Product URL is required");
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      setError("Please enter a valid URL");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:3001/api/add-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url.trim(),
          site: site.trim() || extractSiteFromUrl(url),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to add product");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setUrl("");
      setSite("");

      // Redirect to home after 2 seconds
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      console.error("Error adding product:", err);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "40px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        maxWidth: "600px",
        width: "100%"
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

        {/* Form Card */}
        <div style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "40px",
          boxShadow: "0 15px 50px rgba(0,0,0,0.2)"
        }}>
          <h1 style={{
            color: "#333",
            fontSize: "2rem",
            fontWeight: "700",
            margin: "0 0 8px 0"
          }}>
            Add New Product
          </h1>
          <p style={{
            color: "#666",
            fontSize: "1rem",
            margin: "0 0 32px 0"
          }}>
            Enter the product URL to start tracking its price
          </p>

          {/* Success Message */}
          {success && (
            <div style={{
              background: "#e8f5e9",
              color: "#2e7d32",
              padding: "16px",
              borderRadius: "12px",
              marginBottom: "24px",
              border: "1px solid #4caf50"
            }}>
              <p style={{
                margin: 0,
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                ✓ Product added successfully! Redirecting...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              background: "#ffebee",
              color: "#c62828",
              padding: "16px",
              borderRadius: "12px",
              marginBottom: "24px",
              border: "1px solid #f44336"
            }}>
              <p style={{
                margin: 0,
                fontWeight: "500"
              }}>
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* URL Input */}
            <div style={{
              marginBottom: "24px"
            }}>
              <label
                htmlFor="url"
                style={{
                  display: "block",
                  color: "#333",
                  fontWeight: "600",
                  marginBottom: "8px",
                  fontSize: "0.95rem"
                }}
              >
                Product URL <span style={{ color: "#f44336" }}>*</span>
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={handleUrlChange}
                placeholder="https://example.com/product/123"
                required
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontSize: "1rem",
                  border: "2px solid #e0e0e0",
                  borderRadius: "12px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                  fontFamily: "inherit"
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                onBlur={(e) => e.currentTarget.style.borderColor = "#e0e0e0"}
              />
              <p style={{
                margin: "8px 0 0 0",
                color: "#999",
                fontSize: "0.85rem"
              }}>
                Enter the full URL of the product page you want to track
              </p>
            </div>

            {/* Site Input */}
            <div style={{
              marginBottom: "32px"
            }}>
              <label
                htmlFor="site"
                style={{
                  display: "block",
                  color: "#333",
                  fontWeight: "600",
                  marginBottom: "8px",
                  fontSize: "0.95rem"
                }}
              >
                Site Name
              </label>
              <input
                type="text"
                id="site"
                value={site}
                onChange={(e) => {
                  setSite(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g., vijaysales, amazon, flipkart"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontSize: "1rem",
                  border: "2px solid #e0e0e0",
                  borderRadius: "12px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                  fontFamily: "inherit"
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                onBlur={(e) => e.currentTarget.style.borderColor = "#e0e0e0"}
              />
              <p style={{
                margin: "8px 0 0 0",
                color: "#999",
                fontSize: "0.85rem"
              }}>
                This will be auto-detected from the URL, or you can enter it manually
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px",
                fontSize: "1rem",
                fontWeight: "600",
                color: "#ffffff",
                background: loading
                  ? "#cccccc"
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                borderRadius: "12px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: loading
                  ? "none"
                  : "0 4px 15px rgba(102, 126, 234, 0.4)"
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.5)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.4)";
                }
              }}
            >
              {loading ? "Adding Product..." : "Add Product"}
            </button>
          </form>

          {/* Info Box */}
          <div style={{
            marginTop: "32px",
            padding: "20px",
            background: "#f8f9fa",
            borderRadius: "12px",
            border: "1px solid #e0e0e0"
          }}>
            <h3 style={{
              color: "#333",
              fontSize: "1rem",
              fontWeight: "600",
              margin: "0 0 12px 0"
            }}>
              ℹ️ How it works
            </h3>
            <ul style={{
              margin: 0,
              paddingLeft: "20px",
              color: "#666",
              fontSize: "0.9rem",
              lineHeight: "1.6"
            }}>
              <li>Enter the product URL from any supported e-commerce site</li>
              <li>The system will automatically start tracking price changes</li>
              <li>You'll be notified when the price drops below your target</li>
              <li>View detailed price history and trends on the product page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

