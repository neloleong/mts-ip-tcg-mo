import { useCallback, useEffect, useMemo, useState } from "react";
import { loadVanguardCatalog } from "../../data/vanguardData";
import VanguardCardModal from "./VanguardCardModal";
import { asText, formatNumber, useVanguardResource, VanguardCardTile, VanguardHeading, VanguardPagination, VanguardState } from "./VanguardShared";

const PAGE_SIZE = 48;
const emptyFilters = { series: "", nation: "", clan: "", grade: "", pack: "", rarity: "", type: "" };
function getHashParams() { const hash = window.location.hash; return new URLSearchParams(hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : ""); }
const values = (items, key) => [...new Set(items.flatMap((item) => Array.isArray(item[key]) ? item[key] : [item[key]]).filter((value) => value !== "" && value !== undefined && value !== null))].sort((a,b) => String(a).localeCompare(String(b), "zh-Hant", { numeric: true }));
const includesValue = (value, target) => !target || (Array.isArray(value) ? value.includes(target) : String(value ?? "") === target);

export default function VanguardCardListPage() {
  const resource = useVanguardResource(loadVanguardCatalog);
  const [query, setQuery] = useState("");
  const [deferredQuery, setDeferredQuery] = useState("");
  const [filters, setFilters] = useState(() => ({ ...emptyFilters, pack: getHashParams().get("pack") || "" }));
  const [advanced, setAdvanced] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(() => getHashParams().get("card") || "");
  const cards = resource.data?.cards || [];
  const packs = resource.data?.packs || [];
  const closeCard = useCallback(() => setSelectedId(""), []);
  useEffect(() => { const timer = setTimeout(() => setDeferredQuery(query.trim().toLocaleLowerCase()), 140); return () => clearTimeout(timer); }, [query]);
  useEffect(() => {
    const onHash = () => { const params = getHashParams(); setFilters((old) => ({ ...old, pack: params.get("pack") || "" })); setSelectedId(params.get("card") || ""); setPage(1); };
    window.addEventListener("hashchange", onHash); return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const searchIndex = useMemo(() => cards.map((card) => [card.name, card.nameJp, card.number, card.effect].join(" ").toLocaleLowerCase()), [cards]);
  const options = useMemo(() => ({ series: values(cards, "series"), nation: values(cards,"nations"), clan: values(cards,"clans"), grade: values(cards,"grade"), rarity: values(cards,"rarity"), type: values(cards,"types") }), [cards]);
  const filtered = useMemo(() => cards.filter((card,index) => (!deferredQuery || searchIndex[index].includes(deferredQuery)) && includesValue(card.series,filters.series) && includesValue(card.nations,filters.nation) && includesValue(card.clans,filters.clan) && includesValue(card.grade,filters.grade) && includesValue(card.pack,filters.pack) && includesValue(card.rarity,filters.rarity) && includesValue(card.types,filters.type)), [cards,searchIndex,deferredQuery,filters]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page,totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE,currentPage * PAGE_SIZE);
  const selectedCard = cards.find((card) => card.id === selectedId);
  const updateFilter = (key,value) => { setFilters((old) => ({...old,[key]:value})); setPage(1); };
  const reset = () => { setQuery(""); setDeferredQuery(""); setFilters({...emptyFilters}); setPage(1); };
  const select = (key,label,list) => <label>{label}<select value={filters[key]} onChange={(event) => updateFilter(key,event.target.value)}><option value="">全部{label}</option>{list.map((value) => <option key={value} value={value}>{key === "grade" ? `等級 ${value}` : value}</option>)}</select></label>;
  return <div className="vg-page"><VanguardHeading title="卡牌資料庫" aside="CARD DATABASE">從一張卡的名字、編號，或一句能力文字開始查找。</VanguardHeading><VanguardState {...resource}><section className="vg-filter-panel" aria-label="卡片搜尋及篩選"><div className="vg-search-row"><label className="vg-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="搜尋卡名、編號或能力" placeholder="搜尋中日卡名、卡片編號、能力關鍵字…" value={query} onChange={(event) => {setQuery(event.target.value);setPage(1);}} /></label><button className="vg-button vg-button-outline" type="button" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}>{advanced ? "收起進階篩選 −" : "進階篩選 ＋"}</button><button className="vg-button vg-button-quiet" type="button" onClick={reset}>清除條件</button></div><div className="vg-filter-grid">{select("series","系列",options.series || [])}{select("nation","國家",options.nation || [])}<label>收錄卡包<select value={filters.pack} onChange={(event) => updateFilter("pack",event.target.value)}><option value="">全部卡包</option>{packs.map((pack) => <option key={pack.id} value={pack.code || pack.id}>{pack.code || pack.id} · {pack.name}</option>)}</select></label></div>{advanced && <div className="vg-filter-grid vg-filter-grid-advanced">{select("clan","集團",options.clan || [])}{select("grade","等級",options.grade || [])}{select("rarity","罕貴度",options.rarity || [])}{select("type","卡片類型",options.type || [])}</div>}{Object.values(filters).some(Boolean) && <div className="vg-active-filters">{Object.entries(filters).filter(([,value]) => value).map(([key,value]) => <button className="vg-filter-tag" type="button" key={key} onClick={() => updateFilter(key,"")} aria-label={`移除 ${value} 篩選`}>{value} ×</button>)}</div>}</section><div className="vg-result-bar" role="status"><span>找到 <strong>{formatNumber(filtered.length)}</strong> 筆卡片版本<span> · 共 {formatNumber(cards.length)} 筆</span></span><span>每頁 {PAGE_SIZE} 張 · 第 {currentPage}／{totalPages} 頁</span></div>{visible.length ? <><div className="vg-card-grid">{visible.map((card,index) => <VanguardCardTile key={card.id} card={card} onClick={(item) => setSelectedId(item.id)} eager={index < 6} />)}</div><VanguardPagination page={currentPage} pages={totalPages} onChange={(value) => {setPage(value);window.scrollTo({top:200,behavior:"smooth"});}} /></> : <div className="vg-empty"><h2>未找到符合的卡片</h2><p>試試較短的關鍵字，或移除部分篩選條件。</p><button className="vg-button vg-button-outline" type="button" onClick={reset}>顯示全部卡片</button></div>}<p className="vg-source-note">資料整理日期：{resource.data?.summary?.snapshotDate || "2026-11-13"}。部分版本的能力文字、補充資料或卡圖尚未收錄。</p></VanguardState>{selectedCard && <VanguardCardModal key={selectedCard.id} card={selectedCard} onClose={closeCard} />}</div>;
}
