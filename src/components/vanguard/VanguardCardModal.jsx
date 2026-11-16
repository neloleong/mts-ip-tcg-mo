import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadVanguardCardDetails } from "../../data/vanguardData";
import { asText, safeUrl, useVanguardResource, VanguardImage, VanguardState } from "./VanguardShared";

function DetailItem({ label, value }) {
  const text = asText(value);
  return <div className="vg-detail-item"><span>{label}</span><strong>{text || "—"}</strong></div>;
}

export default function VanguardCardModal({ card, onClose }) {
  const resource = useVanguardResource(() => loadVanguardCardDetails(card), [card.id]);
  const detail = resource.data || card;
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const [imageIndex, setImageIndex] = useState(0);
  const images = detail.images?.length ? detail.images : [{ url: card.imageUrl, imagePath: card.imagePath, label: card.number, available: card.hasImage }];
  const currentImage = images[imageIndex] || images[0];
  const source = safeUrl(detail.sourceUrl || card.sourceUrl);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKey(event) {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key === "Tab") {
        const focusable = [...(panelRef.current?.querySelectorAll('button:not([disabled]), a[href], summary, [tabindex="0"]') || [])].filter((element) => element.getClientRects().length);
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKey); previousFocus?.focus?.(); };
  }, [onClose]);
  return createPortal(<div className="vg-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={panelRef} className="vg-modal-panel" role="dialog" aria-modal="true" aria-labelledby="vg-modal-title"><button ref={closeRef} type="button" className="vg-modal-close" onClick={onClose} aria-label="關閉卡片詳情">×</button><p className="vg-eyebrow">{card.series} / {card.pack}</p><h2 id="vg-modal-title" className="vg-modal-title">{card.name}</h2><p className="vg-modal-subtitle">{card.nameJp}<br />{card.number} · {asText(card.rarity)}</p><div className="vg-modal-layout"><aside className="vg-modal-image-column"><VanguardImage available={currentImage?.available} imagePath={currentImage?.imagePath} imageUrl={currentImage?.url || card.imageUrl} alt={card.name} eager />{images.length > 1 && <div className="vg-modal-image-thumbs" aria-label="其他卡圖">{images.map((image, index) => <button type="button" key={`${image.url}-${index}`} className={index === imageIndex ? "active" : ""} onClick={() => setImageIndex(index)} aria-label={`查看卡圖 ${index + 1}`} aria-pressed={index === imageIndex}><VanguardImage available={image.available} imagePath={image.imagePath} imageUrl={image.url} alt={`卡圖 ${index + 1}`} /></button>)}</div>}</aside><div><div className="vg-detail-grid"><DetailItem label="等級" value={detail.grade} /><DetailItem label="力量" value={detail.power} /><DetailItem label="盾護" value={detail.shield} /><DetailItem label="☆值" value={detail.critical} /><DetailItem label="國家" value={detail.nations} /><DetailItem label="集團" value={detail.clans} /><DetailItem label="種族" value={detail.races} /><DetailItem label="卡片類型" value={detail.types} /><DetailItem label="技能" value={detail.skills} /><DetailItem label="觸發" value={detail.trigger} /></div><section className="vg-detail-section"><h3>卡片能力</h3><p className="vg-detail-effect">{detail.effect || "能力文字待補。此版本目前僅保存基本收錄資料。"}</p></section><VanguardState loading={resource.loading} error={resource.error} retry={resource.retry}>{detail.flavorText && <section className="vg-detail-section"><h3>卡片台詞</h3><p className="vg-detail-flavor">{detail.flavorText}</p>{detail.flavorTextCn && <p className="vg-detail-flavor">{detail.flavorTextCn}</p>}</section>}{detail.illustrator && <p className="vg-detail-note">繪師：{detail.illustrator}</p>}{[ ["備註", detail.remark], ["解說", detail.explain], ["補充解說", detail.neta] ].map(([title, text]) => text ? <section className="vg-detail-section" key={title}><h3>{title}</h3><p className="vg-detail-effect">{asText(text)}</p></section> : null)}{detail.prints?.length > 0 && <section className="vg-detail-section"><h3>其他收錄</h3><div className="vg-print-list">{detail.prints.map((print, index) => <div className="vg-print-item" key={`${print.serial}-${index}`}><strong>{print.serial || print.number}</strong> · {asText(print.vg_rarity_id || print.rarity)}{print.package?.pack_name && <span> · {print.package.pack_name}</span>}{print.flavor_text && <p>{print.flavor_text}</p>}</div>)}</div></section>}{!detail.illustrator && !detail.flavorText && !detail.explain && !detail.neta && <p className="vg-detail-note">此版本的繪師、台詞及補充解說尚未全部收錄。</p>}</VanguardState>{detail.format && <p className="vg-detail-note">賽制參考：{asText(detail.format)}</p>}</div></div></section></div>, document.body);
}
