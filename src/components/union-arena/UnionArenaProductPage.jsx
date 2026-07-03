import { useEffect, useMemo, useState } from "react";

const CARD_DATA_URL = "/data/union-arena-jp/cards.zh.json";

function safeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function pickFirst(row, keys, fallback = "") {
  for (const key of keys) {
    if (row && row[key] !== null && row[key] !== undefined && row[key] !== "") {
      return row[key];
    }
  }

  return fallback;
}

function getProductId(row) {
  return safeText(
    pickFirst(row, [
      "productId",
      "productCode",
      "product_id",
      "product_code",
      "product"
    ])
  );
}

function getProductCode(row) {
  return safeText(
    pickFirst(row, [
      "productCode",
      "product_code",
      "productId",
      "product_id",
      "product"
    ])
  );
}

function getProductName(row) {
  return safeText(
    pickFirst(row, [
      "productNameZh",
      "productNameJp",
      "product_name",
      "productName",
      "product_title",
      "productTitle",
      "title"
    ])
  );
}

function goToProductCards(productId) {
  const encodedProductId = encodeURIComponent(productId);
  window.location.hash = `/games/union-arena/cards?product=${encodedProductId}`;
}

function UnionArenaProductPage() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCards() {
      setLoading(true);
      setLoadError("");

      try {
        const response = await fetch(CARD_DATA_URL);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("cards.zh.json 格式不是 array");
        }

        if (!cancelled) {
          setCards(data);
        }
      } catch (error) {
        if (!cancelled) {
          setCards([]);
          setLoadError(
            "讀取 UNION ARENA cards.zh.json 失敗。請確認 public/data/union-arena-jp/cards.zh.json 已存在。"
          );
          console.error("Failed to load UNION ARENA products:", error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCards();

    return () => {
      cancelled = true;
    };
  }, []);

  const products = useMemo(() => {
    const map = new Map();

    cards.forEach((card) => {
      const productId = getProductId(card) || "unknown";
      const productCode = getProductCode(card) || productId;
      const productName = getProductName(card) || productCode || productId;

      if (!map.has(productId)) {
        map.set(productId, {
          id: productId,
          code: productCode,
          name: productName,
          count: 0
        });
      }

      map.get(productId).count += 1;
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "ja")
    );
  }, [cards]);

  return (
    <section className="page-section union-arena-product-page">
      <div className="section-heading">
        <p className="eyebrow">UNION ARENA</p>
        <h1>商品索引</h1>
        <p>
          從卡牌資料自動整理 UNION ARENA 商品列表。點擊商品即可查看該商品收錄的卡牌。
        </p>
      </div>

      {loading && (
        <div className="result-bar">
          <strong>正在整理商品資料……</strong>
        </div>
      )}

      {loadError && (
        <div className="notice-box warning">
          <strong>資料讀取失敗</strong>
          <p>{loadError}</p>
        </div>
      )}

      {!loading && !loadError && (
        <>
          <div className="result-bar">
            <strong>商品總數：{products.length}</strong>
            <span>卡牌總數：{cards.length}</span>
          </div>

          <div className="ua-product-grid">
            {products.map((product) => (
              <button
                className="ua-product-card ua-product-card-clickable"
                key={product.id}
                type="button"
                onClick={() => goToProductCards(product.id)}
                title={`查看 ${product.name} 收錄卡牌`}
              >
                <p className="eyebrow">{product.code || product.id}</p>
                <h2>{product.name}</h2>
                <p>收錄卡牌：{product.count} 張</p>
                <span className="ua-product-card-action">查看收錄卡牌 →</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default UnionArenaProductPage;