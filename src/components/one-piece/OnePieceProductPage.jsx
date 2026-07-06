import { useEffect, useMemo, useState } from "react";

const PRODUCT_DATA_URL = "/data/one-piece-tc/products.tc.json";

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getProductId(product) {
  return product.id || product.productId || product.productKey || product.code || product.name || product.title || "";
}

function getProductCode(product) {
  return product.code || product.productCode || product.setCode || product.seriesCode || product.productKey || "";
}

function getProductName(product) {
  return product.name || product.title || product.productName || "Unnamed product";
}

function goToProductCards(product) {
  const params = new URLSearchParams();

  const productId = getProductId(product);
  const productCode = getProductCode(product);
  const productName = getProductName(product);

  if (productId) {
    params.set("product", productId);
  }

  if (productCode) {
    params.set("code", productCode);
  }

  if (productName) {
    params.set("name", productName);
  }

  window.location.hash = `/games/one-piece/cards?${params.toString()}`;
}

export default function OnePieceProductPage() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const response = await fetch(PRODUCT_DATA_URL);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("products.tc.json is not an array");
        }

        if (!cancelled) {
          setProducts(data);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(`Failed to load products: ${error.message}`);
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) return products;

    return products.filter((product) => {
      const searchText = normalizeText(product.searchText);
      const name = normalizeText(getProductName(product));
      const code = normalizeText(getProductCode(product));
      const id = normalizeText(getProductId(product));
      const seriesNames = Array.isArray(product.seriesNames)
        ? normalizeText(product.seriesNames.join(" "))
        : "";

      return (
        searchText.includes(keyword) ||
        name.includes(keyword) ||
        code.includes(keyword) ||
        id.includes(keyword) ||
        seriesNames.includes(keyword)
      );
    });
  }, [products, query]);

  return (
    <main className="op-page op-product-page">
      <section className="op-hero">
        <p className="op-kicker">ONE PIECE CARD GAME</p>
        <h1>Products</h1>
        <p>Browse products, series and the number of cards included in each set.</p>
      </section>

      <section className="op-filter-panel">
        <div className="op-search-row">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products, series or card numbers..."
          />
        </div>

        <div className="op-result-summary">
          Showing {filteredProducts.length} / {products.length} products
        </div>
      </section>

      {errorMessage && <div className="op-alert">{errorMessage}</div>}

      <section className="op-product-grid">
        {filteredProducts.map((product) => {
          const productName = getProductName(product);

          return (
            <button
              className="op-product-card op-product-card-clickable"
              key={getProductId(product)}
              type="button"
              onClick={() => goToProductCards(product)}
            >
              <div>
                <p className="op-product-label">PRODUCT</p>
                <h2>{productName}</h2>
              </div>

              <div className="op-product-meta">
                <span>{product.cardCount || 0} cards</span>

                {product.seriesNames?.slice(0, 2).map((seriesName) => (
                  <span key={seriesName}>{seriesName}</span>
                ))}
              </div>

              {product.colors?.length > 0 && (
                <div className="op-card-badges">
                  {product.colors.slice(0, 8).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              )}

              <span className="product-card-hint">View included cards →</span>
            </button>
          );
        })}
      </section>

      {filteredProducts.length === 0 && (
        <div className="op-empty-state">No products matched your search.</div>
      )}
    </main>
  );
}