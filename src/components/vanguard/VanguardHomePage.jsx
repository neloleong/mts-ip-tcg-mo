import { loadVanguardSummary } from "../../data/vanguardData";
import { formatNumber, useVanguardResource, VanguardState, VanguardImage, VG_BASE } from "./VanguardShared";

export default function VanguardHomePage({ navigate }) {
  const resource = useVanguardResource(loadVanguardSummary);
  const summary = resource.data || {};
  const featured = summary.featuredCards || [];
  const go = (page) => navigate?.(page);
  return <div className="vg-page vg-home">
    <section className="vg-hero"><div className="vg-hero-orbit" aria-hidden="true" /><div className="vg-hero-copy"><p className="vg-eyebrow">MTS' CARD GAME LIBRARY / VANGUARD</p><span className="vg-hero-label">卡片戰鬥!! 先導者</span><h1>每一場對戰，<br /><em>從一張卡開始。</em></h1><p>查找卡牌能力、探索歷代收錄卡包，閱讀規則與原站問答。你的先導者資料，集中在這裡。</p><div className="vg-actions"><button className="vg-button" type="button" onClick={() => go(`${VG_BASE}/cards`)}>開始查卡 <span>↗</span></button><button className="vg-button vg-button-outline" type="button" onClick={() => go(`${VG_BASE}/products`)}>瀏覽卡包</button></div><div className="vg-hero-footnote"><span className="vg-status-dot" />無印與 G · V 系列 · D 系列 · ZERO</div></div>
      <div className="vg-hero-art" aria-label="先導者卡片精選">{featured.slice(0, 3).map((card, index) => <div className={`vg-hero-card vg-hero-card-${index}`} key={card.id}><VanguardImage card={card} eager /><div><span>{card.number}</span><strong>{card.name}</strong></div></div>)}<div className={`vg-hero-mark ${featured.length ? "vg-hero-mark-background" : ""}`} aria-hidden="true"><span>V</span><small>VANGUARD</small></div></div></section>
    <VanguardState {...resource}><section className="vg-stat-grid" aria-label="資料庫統計"><div><strong>{formatNumber(summary.totalCards || 32453)}</strong><span>卡片版本</span></div><div><strong>{formatNumber(summary.generalPacks || 282)}</strong><span>一般卡包</span></div><div><strong>{formatNumber(summary.zeroCards || 3587)}</strong><span>ZERO 卡片</span></div><div><strong>{summary.snapshotDate || "2026-11-13"}</strong><span>資料整理日期</span></div></section></VanguardState>
    <section className="vg-feature-links"><button type="button" onClick={() => go(`${VG_BASE}/cards`)}><span>01 / CARD DATABASE</span><h2>找到下一張關鍵卡</h2><p>以中日名稱、編號或能力搜尋，配合國家、集團、等級及罕貴度篩選。</p><b>前往卡牌資料庫 →</b></button><button type="button" onClick={() => go(`${VG_BASE}/rules`)}><span>02 / RULES & REFERENCES</span><h2>讓每一次判定更清楚</h2><p>閱讀規則文章與歷史公告，參考原站保存的公開留言和回覆。</p><b>閱讀規則與問答 →</b></button></section>
    {featured.length > 0 && <section className="vg-featured-section"><div className="vg-section-heading"><div><p className="vg-eyebrow">EXPLORE THE CARDS</p><h2>先從這幾張認識世界</h2></div><button className="vg-text-button" type="button" onClick={() => go(`${VG_BASE}/cards`)}>查看全部卡片 ↗</button></div><div className="vg-featured-grid">{featured.slice(0, 6).map((card) => <button key={card.id} type="button" className="vg-featured-card" onClick={() => { window.location.hash = `/${VG_BASE}/cards?card=${encodeURIComponent(card.id)}`; }}><VanguardImage card={card} /><span>{card.number}</span><h3>{card.name}</h3></button>)}</div></section>}
    <p className="vg-source-note">資料來源：THE一滅寂｜先導者卡牌資料站。部分卡片補充資料與圖片尚未收錄，卡片效果及規則以官方最新公告為準。</p>
  </div>;
}
