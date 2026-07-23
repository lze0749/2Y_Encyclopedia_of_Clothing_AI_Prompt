// 2Y Encyclopedia of Clothing AI Prompt
// Version: v0.4.0

const APP={name:"2Y Encyclopedia of Clothing AI Prompt",version:"0.4.0"};
const state={categories:[],items:[],activeCategoryId:null,searchQuery:""};

document.addEventListener("DOMContentLoaded",async()=>{
  ensureLibraryStyles();
  ensureLibraryPanel();
  bindStartButton();
  bindSearch();
  document.getElementById("showAllButton")?.addEventListener("click",clearFilters);
  await loadData();
});

function ensureLibraryStyles(){
  if(document.querySelector('link[href="./library.css"]'))return;
  const link=document.createElement("link");
  link.rel="stylesheet"; link.href="./library.css"; document.head.appendChild(link);
}
function ensureLibraryPanel(){
  if(document.getElementById("libraryPanel"))return;
  const content=document.querySelector(".content");
  if(!content)return;
  const panel=document.createElement("section");
  panel.id="libraryPanel"; panel.className="library-panel";
  panel.innerHTML=`<div class="library-toolbar"><div><p class="eyebrow">PROMPT LIBRARY</p><h2>預設提示詞資料庫</h2><p id="resultSummary" class="result-summary">正在載入資料……</p></div><button id="showAllButton" class="secondary-button" type="button">顯示全部</button></div><div id="itemList" class="item-grid" aria-live="polite"><p class="library-message">正在載入預設資料……</p></div>`;
  content.appendChild(panel);
}
function bindStartButton(){
  document.getElementById("startButton")?.addEventListener("click",()=>{
    document.getElementById("libraryPanel")?.scrollIntoView({behavior:"smooth"});
  });
}
function bindSearch(){
  const input=document.querySelector(".search-box");
  if(!input)return;
  input.placeholder="搜尋名稱、材質、風格、結構、提示詞……";
  input.addEventListener("input",e=>{
    state.searchQuery=e.target.value.trim().toLowerCase();
    renderItems();
  });
}
async function loadData(){
  try{
    const [cr,ir]=await Promise.all([fetch("./data/categories.json"),fetch("./data/items.json")]);
    if(!cr.ok||!ir.ok)throw new Error("JSON 資料載入失敗");
    state.categories=await cr.json();
    state.items=await ir.json();
    applyCounts(); renderCategories(); renderStatistics(); renderItems();
  }catch(error){
    console.error(error);
    document.getElementById("itemList").innerHTML=`<p class="library-message error-message">${escapeHtml(error.message)}</p>`;
  }
}
function applyCounts(){
  const counts={};
  state.items.forEach(i=>counts[i.category]=(counts[i.category]||0)+1);
  state.categories=state.categories.map(c=>({...c,count:counts[c.id]||0}));
}
function renderCategories(){
  const list=document.getElementById("categoryList"); if(!list)return;
  list.innerHTML="";
  state.categories.forEach(c=>{
    const li=document.createElement("li");
    const b=document.createElement("button");
    b.type="button"; b.className="category-button"; b.dataset.categoryId=c.id;
    b.innerHTML=`<span class="category-icon">${escapeHtml(c.icon)}</span><span class="category-label"><strong>${escapeHtml(c.name_zh)}</strong><small>${escapeHtml(c.name_en)}</small></span><span class="category-count">${c.count}</span>`;
    b.addEventListener("click",()=>state.activeCategoryId===c.id?clearCategory():selectCategory(c));
    li.appendChild(b); list.appendChild(li);
  });
}
function selectCategory(c){
  state.activeCategoryId=c.id; updateActive();
  const t=document.getElementById("pageTitle"),d=document.getElementById("pageDescription");
  if(t)t.textContent=`${c.icon} ${c.name_zh}`;
  if(d)d.textContent=c.description;
  renderItems();
}
function clearCategory(){
  state.activeCategoryId=null; updateActive();
  const t=document.getElementById("pageTitle"),d=document.getElementById("pageDescription");
  if(t)t.textContent="Welcome 👋";
  if(d)d.textContent="Build prompts for PixAI, Niji Journey, TensorArt and GPT Image.";
  renderItems();
}
function clearFilters(){
  state.searchQuery=""; const input=document.querySelector(".search-box"); if(input)input.value="";
  clearCategory();
}
function updateActive(){
  document.querySelectorAll(".category-button").forEach(b=>b.classList.toggle("active",b.dataset.categoryId===state.activeCategoryId));
}
function filteredItems(){
  return state.items.filter(i=>{
    if(state.activeCategoryId&&i.category!==state.activeCategoryId)return false;
    if(!state.searchQuery)return true;
    return [i.name_zh,i.name_en,i.description_zh,i.description_en,i.gender,...Object.values(i.anatomy||{}),...(i.tags||[]),...Object.values(i.prompts||{}),i.negative].join(" ").toLowerCase().includes(state.searchQuery);
  });
}
function renderItems(){
  const list=document.getElementById("itemList"),summary=document.getElementById("resultSummary");
  if(!list)return;
  const rows=filteredItems();
  const cat=state.categories.find(c=>c.id===state.activeCategoryId);
  if(summary)summary.textContent=`${cat?cat.name_zh:"全部分類"}：${rows.length} 筆`;
  if(!rows.length){list.innerHTML='<p class="library-message">找不到符合條件的資料。</p>';return;}
  list.innerHTML=""; rows.forEach(i=>list.appendChild(card(i)));
}
function card(i){
  const a=document.createElement("article"); a.className="prompt-card";
  const c=state.categories.find(x=>x.id===i.category);
  const anatomy=Object.entries(i.anatomy||{}).map(([k,v])=>`<div class="anatomy-row"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join("");
  const tags=(i.tags||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("");
  a.innerHTML=`<div class="prompt-card-header"><div><p class="card-category">${escapeHtml(c?.icon||"✦")} ${escapeHtml(c?.name_zh||i.category)}</p><h3>${escapeHtml(i.name_zh)}</h3><p class="english-name">${escapeHtml(i.name_en)}</p></div><span class="gender-chip">${formatGender(i.gender)}</span></div><p class="item-description">${escapeHtml(i.description_zh)}</p><div class="tag-list">${tags}</div><details class="item-details"><summary>查看結構與完整提示詞</summary><div class="detail-content"><section><h4>結構說明</h4><dl class="anatomy-list">${anatomy}</dl></section><section><h4>英文描述</h4><p>${escapeHtml(i.description_en)}</p></section>${promptSection("PixAI",i.prompts.pixai)}${promptSection("Niji",i.prompts.niji)}${promptSection("TensorArt",i.prompts.tensorart)}${promptSection("GPT Image",i.prompts.gpt)}<section><h4>Negative Prompt</h4><p>${escapeHtml(i.negative)}</p><button class="copy-button" data-copy="${escapeAttr(i.negative)}">複製 Negative</button></section></div></details>`;
  a.querySelectorAll(".copy-button").forEach(b=>b.addEventListener("click",()=>copyText(b.dataset.copy||"")));
  return a;
}
function promptSection(label,text){return `<section><div class="prompt-section-heading"><h4>${label}</h4><button class="copy-button" data-copy="${escapeAttr(text)}">複製</button></div><p class="prompt-text">${escapeHtml(text)}</p></section>`;}
function renderStatistics(){
  const s=document.getElementById("statsList"); if(!s)return;
  s.innerHTML=`<li>分類數量<span>${state.categories.length}</span></li><li>預設資料<span>${state.items.length}</span></li><li>支援平台<span>4</span></li><li>App 版本<span>${APP.version}</span></li>`;
}
async function copyText(text){
  try{await navigator.clipboard.writeText(text);}catch{const t=document.createElement("textarea");t.value=text;document.body.appendChild(t);t.select();document.execCommand("copy");t.remove();}
  showToast("提示詞已複製");
}
function showToast(msg){
  let t=document.getElementById("appToast");
  if(!t){t=document.createElement("div");t.id="appToast";t.className="app-toast";document.body.appendChild(t);}
  t.textContent=msg;t.classList.add("show");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove("show"),1800);
}
function formatGender(g){return({female:"女裝",male:"男裝",unisex:"男女皆可",none:"通用元素"})[g]||g;}
function escapeHtml(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function escapeAttr(v=""){return escapeHtml(v).replaceAll("\n","&#10;").replaceAll("\r","&#13;");}
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.error));
