import { products } from "../../data/products";

function getProductTitle(product) {
  return product.name || product.title || product.productName || "未命名商品";
}

function getProductCode(product) {
  return product.code || product.productCode || product.setCode || product.seriesCode || "";
}

function goToProductCards(product) {
  const params = new URLSearchParams();

  if (product.id) {
    params.set("product", product.id);
  }

  const code = getProductCode(product);
  if (code) {
    params.set("code", code);
  }

  const name = getProductTitle(product);
  if (name) {
    params.set("name", name);
  }

  window.location.hash = `/games/harry-potter/cards?${params.toString()}`;
}

function ProductPage() {
  return (
    <section className="page-section">
      <div className="page-title-block">
        <span className="eyebrow">Products</span>
        <h1>商品情報</h1>
        <p>整理補充包、起始牌組、特典卡及收錄卡清單。</p>
      </div>

      <div className="info-grid">
        {products.map((product) => {
          const title = getProductTitle(product);

          return (
            <button
              className="info-card hp-product-card-clickable"
              key={product.id || title}
              type="button"
              onClick={() => goToProductCards(product)}
            >
              <span>{product.type || "PRODUCT"}</span>
              <h2>{title}</h2>
              <p>{product.description}</p>

              {product.releaseDate && (
                <small>發售日期：{product.releaseDate}</small>
              )}

              <small className="product-card-hint">點擊查看收錄卡牌 →</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default ProductPage;