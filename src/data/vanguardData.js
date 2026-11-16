const BASE = `${import.meta.env.BASE_URL || "/"}data/vanguard/`;
const cache = new Map();

function loadJson(file) {
  if (!cache.has(file)) {
    const promise = fetch(`${BASE}${file}`).then((response) => {
      if (!response.ok) throw new Error(`先導者資料讀取失敗 (${response.status})`);
      return response.json();
    }).catch((error) => { cache.delete(file); throw error; });
    cache.set(file, promise);
  }
  return cache.get(file);
}

function originalImageUrl(imagePath, sourceUrl = "") {
  if (sourceUrl && /^https?:\/\//i.test(sourceUrl)) return sourceUrl.replace(/^http:\/\//i, "https://");
  if (imagePath) return `https://vg-assets.yimieji.com/data/${String(imagePath).replace(/^\/+/, "")}`;
  return "";
}

export function resolveVanguardImage(imagePath, sourceUrl = "") {
  const configured = String(import.meta.env.VITE_VANGUARD_ASSET_BASE_URL || "").trim();
  if (configured && imagePath) return `${configured.replace(/\/+$/, "")}/${String(imagePath).replace(/^\/+/, "")}`;
  return originalImageUrl(imagePath, sourceUrl);
}

export function loadVanguardSummary() { return loadJson("summary.json"); }
export function loadVanguardArticles() { return loadJson("articles.json"); }
export function loadVanguardFeedback() { return loadJson("feedback.json"); }

let catalogPromise;
export function loadVanguardCatalog() {
  if (!catalogPromise) {
    catalogPromise = Promise.all([loadJson("cards-index.json"), loadJson("packs.json"), loadVanguardSummary()])
      .then(([data, packs, summary]) => {
        const cards = data.rows.map((row) => {
          const card = Object.fromEntries(data.columns.map((field, index) => [field, row[index]]));
          card.effect = data.effects[card.effect] || "";
          if (data.arrayValues) {
            for (const field of data.arrayFields) card[field] = data.arrayValues[card[field]] || [];
          }
          card.imageUrl = originalImageUrl(card.imagePath, card.imageUrl);
          if (card.sourceUrl?.startsWith("/")) card.sourceUrl = `https://vgcard.yimieji.com${card.sourceUrl}`;
          return card;
        });
        return { cards, packs, summary };
      }).catch((error) => { catalogPromise = undefined; throw error; });
  }
  return catalogPromise;
}

export async function loadVanguardCardDetails(cardOrId) {
  const card = typeof cardOrId === "string"
    ? (await loadVanguardCatalog()).cards.find((item) => item.id === cardOrId)
    : cardOrId;
  if (!card) throw new Error("找不到這張卡片。");
  const shard = await loadJson(card.detailFile);
  const saved = shard[card.id];
  if (!saved) throw new Error("此卡片的已存資料暫未能讀取。");
  const raw = saved.fields || {};
  return {
    ...card,
    illustrator: raw.illustrator || "",
    flavorText: raw.flavor_text || "",
    flavorTextCn: raw.flavor_text_chn || "",
    remark: raw.remark || "",
    explain: raw.explain || "",
    neta: raw.neta || "",
    critical: raw.vg_critical_id ?? raw.critical ?? "",
    trigger: raw["vg_trigger_id$SC"] || raw.vg_trigger_id || raw.trigger || "",
    gift: raw.vg_gift_id || [],
    format: raw["vg_match_id$SC"] || raw["version$SC"] || raw.vg_match_id || raw.version || "",
    year: raw.yearmark || raw.pub_date || "",
    images: (saved.images || []).map((image) => ({ ...image, url: originalImageUrl(image.imagePath, image.url) })),
    prints: raw.packs || [],
    rawFields: raw,
    sourceIds: saved.sourceIds || {},
  };
}
