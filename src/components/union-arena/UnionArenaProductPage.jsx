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
      "product_id",
      "product",
      "seriesId",
      "series_id"
    ])
  );
}

function getProductCode(row) {
  return safeText(
    pickFirst(row, [
      "productCode",
      "product_code",
      "code",
      "seriesCode",
      "series_code"
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
      "seriesName",
      "series_name",
      "title"
    ])
  );
}

function getCardProductKey(row) {
  const productId = getProductId(row);
  const productCode = getProductCode(row);
  const productName = getProductName(row);

  return productId || productCode || productName || "unknown";
}

function buildProductHash(product) {
  const params = new URLSearchParams();

  if (product.id) {
    params.set("product", product.id);
  }

  if (product.code) {
    params.set("code", product.code);
  }

  if (product.name) {
    params.set("name", product.name);
  }

  return `#/games/union-arena/cards?${params.toString()}`;
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
          throw new Error("cards.zh.json format is not array");
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
      const productKey = getCardProductKey(card);
      const productId = getProductId(card) || productKey;
      const productCode = getProductCode(card);
      const productName = getProductName(card) || productCode || productId;

      if (!map.has(productKey)) {
        map.set(productKey, {
          id: productId,
          code: productCode,
          name: productName,
          count: 0
        });
      }

      map.get(productKey).count += 1;
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
          這裡會從 cards.json 自動整理 UNION ARENA 的商品列表。點擊商品格即可查看該系列收錄的卡牌。
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
              <a
                className="ua-product-card ua-product-card-link"
                key={`${product.id}-${product.code}-${product.name}`}
                href={buildProductHash(product)}
                title={`查看 ${product.name} 收錄卡牌`}
              >
                <p className="eyebrow">{product.code || product.id}</p>
                <h2>{product.name}</h2>
                <p>收錄卡牌：{product.count} 張</p>
              </a>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default UnionArenaProductPage;