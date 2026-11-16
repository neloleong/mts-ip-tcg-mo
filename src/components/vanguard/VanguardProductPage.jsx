import { useMemo, useState } from "react";
import { loadVanguardCatalog } from "../../data/vanguardData";
import { formatNumber, useVanguardResource, VanguardHeading, VanguardPagination, VanguardState, VG_BASE, safeUrl } from "./VanguardShared";

export default function VanguardProductPage() {
  const resource = useVanguardResource(loadVanguardCatalog);
  const [query,setQuery] = useState("");
  const [category,setCategory] = useState("");
  const [page,setPage] = useState(1);
  const packs = resource.data?.packs || [];
  const filtered = useMemo(() => {
    const text = query.trim().toLocaleLowerCase();
    return packs.filter((pack) => (!text || [pack.code,pack.name,pack.nameJp,pack.description].join(" ").toLocaleLowerCase().includes(text)) && (!category || (category === "zero" ? pack.isZero : !pack.isZero))).sort((a,b) => String(b.releaseDate || "").localeCompare(String(a.releaseDate || "")) || String(a.code).localeCompare(String(b.code),undefined,{numeric:true}));
  },[packs,query,category]);
  const pages = Math.max(1,Math.ceil(filtered.length / 24));
  const currentPage = Math.min(page,pages);
  return <div className="vg-page"><VanguardHeading title="卡包與收錄系列" aside="PRODUCT LIBRARY">從起始卡組到補充包，依照商品名稱、編號或發售日期探索收錄卡片。</VanguardHeading><VanguardState {...resource}><section className="vg-filter-panel"><div className="vg-search-row"><label className="vg-search"><span aria-hidden="true">⌕</span><input aria-label="搜尋卡包" type="search" placeholder="搜尋卡包編號、名稱或收錄說明…" value={query} onChange={(event) => {setQuery(event.target.value);setPage(1);}} /></label><select aria-label="卡包類別" style={{width:190}} value={category} onChange={(event) => {setCategory(event.target.value);setPage(1);}}><option value="">全部分類</option><option value="general">一般卡包</option><option value="zero">ZERO 日期分類</option></select></div></section><div className="vg-result-bar"><span>找到 <strong>{formatNumber(filtered.length)}</strong> 個收錄分類</span><span>一般卡包 282 · ZERO 日期分類 33</span></div>{filtered.length ? <><div className="vg-pack-grid">{filtered.slice((currentPage - 1)*24,currentPage*24).map((pack) => <article className="vg-pack" key={pack.id}><span className="vg-pack-code">{pack.code || pack.id}</span><h2>{pack.name}</h2><p className="vg-pack-date">{pack.releaseDate ? `${pack.isZero ? "收錄月份" : "發售日期"}：${pack.releaseDate}` : "發售日期未收錄"}</p><div className="vg-pack-meta"><span>{pack.isZero ? "ZERO 日期分類" : pack.series || "一般卡包"}</span><span>{formatNumber(pack.cardCount)} 個卡片版本</span></div>{pack.description && <details><summary>查看收錄說明</summary><p className="vg-pack-description">{pack.description}</p></details>}<button className="vg-button vg-button-quiet" type="button" onClick={() => {window.location.hash = `/${VG_BASE}/cards?pack=${encodeURIComponent(pack.code || pack.id)}`;}}>查看收錄卡片 →</button>{safeUrl(pack.sourceUrl) && <a className="vg-source-link" href={pack.sourceUrl} target="_blank" rel="noopener noreferrer">原站資料 ↗</a>}</article>)}</div><VanguardPagination page={currentPage} pages={pages} onChange={(value) => {setPage(value);window.scrollTo({top:200,behavior:"smooth"});}} /></> : <div className="vg-empty"><h2>未找到符合的卡包</h2><p>請調整搜尋字或分類。</p><button type="button" className="vg-button vg-button-outline" onClick={() => {setQuery("");setCategory("");}}>重設搜尋</button></div>}</VanguardState></div>;
}
