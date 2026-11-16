import { Fragment, useEffect, useMemo, useState } from "react";
import { loadVanguardArticles, loadVanguardFeedback, resolveVanguardImage } from "../../data/vanguardData";
import { formatNumber, safeUrl, useVanguardResource, VanguardHeading, VanguardPagination, VanguardState } from "./VanguardShared";

const ALLOWED = new Set(["p","div","span","h1","h2","h3","h4","h5","h6","b","strong","i","em","u","s","br","hr","blockquote","ul","ol","li","table","thead","tbody","tfoot","tr","td","th","pre","code","sup","sub"]);
const IGNORE = new Set(["script","style","iframe","object","embed","form","input","button","textarea","select","svg"]);

function ArticleImage({ src, alt }) {
  const [failed,setFailed] = useState(false);
  useEffect(() => setFailed(false),[src]);
  let url = src;
  if (url?.startsWith("assets/")) url = `https://${url.slice(7)}`;
  const mediaPath = url?.includes("vg-assets.yimieji.com/data/") ? url.split("vg-assets.yimieji.com/data/")[1] : "";
  const resolved = mediaPath ? resolveVanguardImage(mediaPath,url) : safeUrl(url)?.replace(/^http:/,"https:");
  if (!resolved || failed) return <span className="vg-article-missing-image">文章圖片尚未收錄{safeUrl(url) && <> · <a href={url} target="_blank" rel="noopener noreferrer">原始連結</a></>}</span>;
  return <img src={resolved} alt={alt || "文章圖片"} loading="lazy" onError={() => setFailed(true)} />;
}

function ArticleContent({ article, onArticle }) {
  const content = useMemo(() => {
    if (!article.html || typeof DOMParser === "undefined") return <p style={{whiteSpace:"pre-wrap"}}>{article.text || "此文章尚未收錄內文。"}</p>;
    const document = new DOMParser().parseFromString(article.html,"text/html");
    function render(node,key) {
      if (node.nodeType === 3) return node.textContent;
      if (node.nodeType !== 1) return null;
      const tag = node.tagName.toLowerCase();
      if (IGNORE.has(tag)) return null;
      const children = [...node.childNodes].map((child,index) => render(child,`${key}-${index}`));
      if (tag === "img") return <ArticleImage key={key} src={node.getAttribute("src")} alt={node.getAttribute("alt")} />;
      if (tag === "a") {
        const internal = node.getAttribute("data-article-link");
        const href = node.getAttribute("href") || "";
        if (internal || href.startsWith("#article:")) return <a key={key} href="#" onClick={(event) => {event.preventDefault();onArticle(internal || href.slice(1));}}>{children}</a>;
        const url = safeUrl(href);
        return url ? <a key={key} href={url} target="_blank" rel="noopener noreferrer">{children}</a> : <Fragment key={key}>{children}</Fragment>;
      }
      if (!ALLOWED.has(tag)) return <Fragment key={key}>{children}</Fragment>;
      const props = {key};
      if (["td","th"].includes(tag)) for (const [attribute,property] of [["colspan","colSpan"],["rowspan","rowSpan"]]) {const value = Number(node.getAttribute(attribute)); if (value > 0 && value < 100) props[property] = value;}
      const Tag = tag;
      return ["br","hr"].includes(tag) ? <Tag {...props} /> : <Tag {...props}>{children}</Tag>;
    }
    return [...document.body.childNodes].map((node,index) => render(node,`article-${index}`));
  },[article,onArticle]);
  return <div className="vg-article-content">{content}</div>;
}

export default function VanguardRulesPage() {
  const articlesResource = useVanguardResource(loadVanguardArticles);
  const feedbackResource = useVanguardResource(loadVanguardFeedback);
  const [tab,setTab] = useState("articles");
  const [query,setQuery] = useState("");
  const [category,setCategory] = useState("規則");
  const [selectedId,setSelectedId] = useState("");
  const [feedbackStatus,setFeedbackStatus] = useState("");
  const [page,setPage] = useState(1);
  const articles = articlesResource.data || [];
  const feedback = feedbackResource.data || [];
  const filteredArticles = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return articles.filter((article) => (!category || article.category === category) && (!q || [article.title,article.text].join(" ").toLocaleLowerCase().includes(q)));
  },[articles,query,category]);
  const selectedArticle = articles.find((article) => article.id === selectedId) || filteredArticles[0];
  const filteredFeedback = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return feedback.filter((item) => (!q || [item.id,item.nick,item.content,item.last_reply].join(" ").toLocaleLowerCase().includes(q)) && (!feedbackStatus || (feedbackStatus === "answered" ? Boolean(item.last_reply) : !item.last_reply)));
  },[feedback,query,feedbackStatus]);
  const pages = Math.max(1,Math.ceil(filteredFeedback.length / 20));
  const currentPage = Math.min(page,pages);
  const selectArticle = (id) => {const article = articles.find((item) => item.id === id);if (article) {setSelectedId(id);setCategory("");setQuery("");}};
  return <div className="vg-page"><VanguardHeading title="規則與參考資料" aside="RULES & REFERENCES">閱讀規則文章、歷史公告，以及原站保存的公開提問和回覆。</VanguardHeading><div className="vg-tabs" role="tablist" aria-label="參考資料類型"><button type="button" role="tab" aria-selected={tab === "articles"} className={tab === "articles" ? "active" : ""} onClick={() => {setTab("articles");setQuery("");}}>規則與文章</button><button type="button" role="tab" aria-selected={tab === "feedback"} className={tab === "feedback" ? "active" : ""} onClick={() => {setTab("feedback");setQuery("");setPage(1);}}>原站公開問答</button></div>{tab === "articles" ? <VanguardState {...articlesResource}><section className="vg-filter-panel"><div className="vg-search-row"><label className="vg-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="搜尋規則文章" placeholder="搜尋文章名稱或內文…" value={query} onChange={(event) => {setQuery(event.target.value);setSelectedId("");}} /></label><select aria-label="文章分類" style={{width:180}} value={category} onChange={(event) => {setCategory(event.target.value);setSelectedId("");}}><option value="">全部文章</option><option value="規則">規則</option><option value="公告">公告</option><option value="原站資料">原站資料</option></select></div></section><div className="vg-result-bar"><span>共 <strong>{formatNumber(filteredArticles.length)}</strong> 篇文章</span><span>歷史資料請參考原文日期</span></div>{filteredArticles.length ? <div className="vg-reading-layout"><nav className="vg-article-list" aria-label="文章列表">{filteredArticles.map((article) => <button type="button" key={article.id} className={selectedArticle?.id === article.id ? "active" : ""} onClick={() => setSelectedId(article.id)}><span>{article.category}</span>{article.title}</button>)}</nav>{selectedArticle && <article className="vg-article-panel"><p className="vg-eyebrow">{selectedArticle.category === "原站資料" ? "ORIGINAL SITE ARCHIVE" : "REFERENCE ARTICLE"}</p><h2>{selectedArticle.title}</h2><p className="vg-article-date">{selectedArticle.date ? `原文更新：${selectedArticle.date}` : "原文日期未收錄"}{selectedArticle.category === "原站資料" ? " · 此為原站內容存檔" : ""}</p><ArticleContent article={selectedArticle} onArticle={selectArticle} />{safeUrl(selectedArticle.sourceUrl) && <a className="vg-source-link" href={selectedArticle.sourceUrl} target="_blank" rel="noopener noreferrer">閱讀原站文章 ↗</a>}</article>}</div> : <div className="vg-empty"><h2>沒有符合的文章</h2><p>請更換關鍵字或分類。</p><button className="vg-button vg-button-outline" type="button" onClick={() => {setQuery("");setCategory("");}}>查看全部文章</button></div>}</VanguardState> : <VanguardState {...feedbackResource}><p className="vg-lead">以下為 THE一滅寂原站的公開留言及回覆存檔，並非本網站新收到的提問。回覆僅供參考，正式規則以官方最新公告為準。</p><section className="vg-filter-panel"><div className="vg-search-row"><label className="vg-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="搜尋原站公開問答" placeholder="搜尋提問、卡片、回覆或留言編號…" value={query} onChange={(event) => {setQuery(event.target.value);setPage(1);}} /></label><select aria-label="回覆狀態" style={{width:170}} value={feedbackStatus} onChange={(event) => {setFeedbackStatus(event.target.value);setPage(1);}}><option value="">全部留言</option><option value="answered">已有回覆</option><option value="pending">未回覆</option></select></div></section><div className="vg-result-bar"><span>共 <strong>{formatNumber(filteredFeedback.length)}</strong> 則留言</span><span>每頁 20 則</span></div><div className="vg-feedback-list">{filteredFeedback.slice((currentPage - 1)*20,currentPage*20).map((item) => <article className="vg-feedback" key={item.id}><div className="vg-feedback-header"><strong>{item.nick || "匿名"}</strong><span>#{item.id}</span><span>{item.created_at || ""}</span><span className={`vg-feedback-status ${item.last_reply ? "" : "pending"}`}>{item.last_reply ? "已有回覆" : "未回覆"}</span></div><p>{item.content}</p>{item.last_reply && <div className="vg-feedback-reply">{item.last_reply}</div>}</article>)}</div>{!filteredFeedback.length && <div className="vg-empty"><h2>沒有符合的留言</h2><p>請更換搜尋字或回覆狀態。</p></div>}<VanguardPagination page={currentPage} pages={pages} onChange={(value) => {setPage(value);window.scrollTo({top:200,behavior:"smooth"});}} /></VanguardState>}<p className="vg-source-note">保留原始文章及回覆內容；原站聯絡資料不代表本網站的聯絡方式。</p></div>;
}
