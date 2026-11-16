export default function PortalHomePage({ navigate }) {
  return (
    <div className="portal-home-page">
      <section className="portal-hero">
        <div className="portal-hero-copy">
          <p className="eyebrow">MTS' CARD GAME LIBRARY</p>

          <h1>中文卡牌遊戲資料庫平台</h1>

          <p>
            以中文玩家查詢、收藏整理、規則理解及商品情報為核心，建立多款卡牌遊戲的資料入口。
            目前已開放 Harry Potter TCG、UNION ARENA、ONE PIECE Card Game 及 Vanguard。
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate("games")}
            >
              查看所有遊戲
            </button>
          </div>
        </div>
      </section>

      <section className="database-index-section">
        <p className="eyebrow">DATABASE INDEX</p>
        <h2>已開放與規劃中的遊戲資料庫</h2>
        <p>
          請進入遊戲列表查看目前已開放及規劃中的卡牌遊戲資料庫。
        </p>

        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate("games")}
        >
          前往遊戲列表
        </button>
      </section>
    </div>
  );
}