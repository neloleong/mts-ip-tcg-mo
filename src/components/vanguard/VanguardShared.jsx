import { useEffect, useState } from "react";
import { resolveVanguardImage } from "../../data/vanguardData";
import "./vanguard.css";

export const VG_BASE = "games/vanguard";
export const formatNumber = (value) => Number(value || 0).toLocaleString("zh-Hant");
export const asText = (value) => Array.isArray(value) ? value.filter(Boolean).join(" / ") : String(value ?? "");
export const safeUrl = (value) => {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; }
};

export function useVanguardResource(load, dependencies = []) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    Promise.resolve().then(load).then((data) => {
      if (active) setState({ data, loading: false, error: "" });
    }).catch((error) => {
      if (active) setState({ data: null, loading: false, error: error?.message || "暫時無法載入資料。" });
    });
    return () => { active = false; };
  }, [...dependencies, attempt]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}

export function VanguardState({ loading, error, retry, children }) {
  if (loading) return <div className="vg-state" role="status"><span className="vg-loader" />正在載入先導者資料…</div>;
  if (error) return <div className="vg-state vg-state-error" role="alert"><h2>暫時無法載入資料</h2><p>{error}</p><button className="vg-button" type="button" onClick={retry}>重新載入</button></div>;
  return children;
}

export function VanguardImage({ card, imagePath, imageUrl, available, alt, className = "", eager = false }) {
  const path = imagePath ?? card?.imagePath;
  const original = imageUrl ?? card?.imageUrl;
  const primary = resolveVanguardImage(path, original);
  const source = safeUrl(original)?.replace(/^http:/, "https:");
  const [current, setCurrent] = useState(primary || source || "");
  const [failed, setFailed] = useState(false);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setCurrent(primary || source || ""); setFailed(false); setFallbackUsed(false); setLoaded(false);
  }, [primary, source]);
  if (failed || !current || available === false || card?.hasImage === false) return <div className={`vg-image-placeholder ${className}`}><span aria-hidden="true">◇</span><small>暫無卡圖</small></div>;
  return <div className={`vg-card-image vg-image-frame ${className}`}>{!loaded && <div className="vg-image-pending" aria-hidden="true"><span>◇</span><small>卡片圖片</small></div>}<img className={`vg-image-content ${loaded ? "loaded" : ""}`} src={current} alt={alt || card?.name || "先導者卡片"} loading={eager ? "eager" : "lazy"} decoding="async" onLoad={() => setLoaded(true)} onError={() => {
    if (!fallbackUsed && source && source !== current) { setCurrent(source); setFallbackUsed(true); setLoaded(false); }
    else setFailed(true);
  }} /></div>;
}

export function VanguardHeading({ eyebrow, title, children, aside }) {
  return <header className="vg-page-heading"><div><p className="vg-eyebrow">{eyebrow || "CARDFIGHT!! VANGUARD"}</p><h1>{title}</h1>{children && <p className="vg-lead">{children}</p>}</div>{aside && <div className="vg-heading-aside">{aside}</div>}</header>;
}

export function VanguardCardTile({ card, onClick, eager = false }) {
  return <button type="button" className="vg-card-tile" onClick={() => onClick(card)} aria-label={`查看 ${card.name}，${card.number}`}>
    <div className="vg-card-art"><VanguardImage card={card} eager={eager} /><span className="vg-rarity">{asText(card.rarity) || "—"}</span></div>
    <div className="vg-card-copy"><span className="vg-card-number">{card.number}</span><h3>{card.name}</h3><p>{card.series} · 等級 {card.grade ?? "—"}</p><div className="vg-card-meta"><span>{asText(card.nations) || asText(card.clans) || "先導者"}</span><span>{card.power ? `${card.power} 力量` : ""}</span></div></div>
  </button>;
}

export function VanguardPagination({ page, pages, onChange }) {
  if (pages < 2) return null;
  return <nav className="vg-pagination" aria-label="分頁"><button type="button" className="vg-button vg-button-quiet" disabled={page === 1} onClick={() => onChange(page - 1)}>← 上一頁</button><span>第 {page}／{pages} 頁</span><button type="button" className="vg-button vg-button-quiet" disabled={page === pages} onClick={() => onChange(page + 1)}>下一頁 →</button></nav>;
}
