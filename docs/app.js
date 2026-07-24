
const APP={name:"2Y Encyclopedia of Clothing AI Prompt",version:"1.1.0",theme:"neon",language:"zh-TW"};
const state={categories:[],items:[],activeCategoryId:null,searchQuery:"",genderFilter:"all",sortMode:"category",pageSize:24,visibleCount:24};

document.addEventListener("DOMContentLoaded",async()=>{
  ensureCss("./library.css"); ensureCss("./filters.css"); ensureLibraryPanel();
  bindSearch(); bindControls(); await loadData();
});

function ensureCss(href){
  if(document.querySelector(`link[href="${href}"]`))return;
  const link=document.createElement("link"); link.rel="stylesheet"; link.href=href; document.head.appendChild(link);
}
function ensureLibraryPanel(){
  let panel=document.getElementById("libraryPanel");
  if(!panel){
    const content=document.querySelector(".content"); if(!content)return;
    panel=document.createElement("section"); panel.id="libraryPanel"; panel.className="library-panel";
    panel.innerHTML=`
      <div class="library-toolbar">
        <div><p class="eyebrow">PROMPT LIBRARY</p><h2>預設提示詞資料庫</h2><p id="resultSummary" class="result-summary">正在載入資料……</p></div>
        <button id="showAllButton" class="secondary-button" type="button">清除篩選</button>
      </div>
      <div id="advancedFiltersMount"></div>
      <div id="activeFilterSummary" class="active-filter-summary"></div>
      <div id="itemList" class="item-grid" aria-live="polite"><p class="library-message">正在載入預設資料……</p></div>
      <div class="load-more-wrap"><button id="loadMoreButton" type="button" class="load-more-button" hidden>載入更多</button></div>`;
    const dashboard=document.querySelector(".dashboard");
    dashboard?.parentElement===content?dashboard.insertAdjacentElement("afterend",panel):content.appendChild(panel);
  }
  const mount=document.getElementById("advancedFiltersMount");
  if(mount&&!mount.dataset.ready){
    mount.dataset.ready="true";
    mount.innerHTML=`
      <div class="advanced-filter-bar">
        <label class="filter-field"><span>適用</span><select id="genderFilter">
          <option value="all">全部</option><option value="female">女裝＋中性</option><option value="male">男裝＋中性</option><option value="unisex">僅男女皆可</option><option value="none">通用元素</option>
        </select></label>
        <label class="filter-field"><span>排序</span><select id="sortMode">
          <option value="category">依分類</option><option value="name-zh">中文名稱 A–Z</option><option value="name-en">英文名稱 A–Z</option><option value="gender">依適用類型</option><option value="custom-first">自訂項目優先</option>
        </select></label>
        <label class="filter-field"><span>每次顯示</span><select id="pageSize">
          <option value="12">12 筆</option><option value="24" selected>24 筆</option><option value="48">48 筆</option><option value="96">96 筆</option>
        </select></label>
        <div class="filter-tip">搜尋支援多個關鍵字，例如：<code>紫色 皮革 哥德</code></div>
      </div>`;
  }
}
function bindSearch(){
  const input=document.querySelector(".search-box"); if(!input)return;
  input.placeholder="搜尋名稱、材質、風格、結構、提示詞……";
  input.addEventListener("input",e=>{state.searchQuery=e.target.value.trim().toLowerCase(); resetVisible(); renderItems();});
}
function bindControls(){
  document.getElementById("showAllButton")?.addEventListener("click",clearFilters);
  document.getElementById("genderFilter")?.addEventListener("change",e=>{state.genderFilter=e.target.value;resetVisible();renderItems();});
  document.getElementById("sortMode")?.addEventListener("change",e=>{state.sortMode=e.target.value;resetVisible();renderItems();});
  document.getElementById("pageSize")?.addEventListener("change",e=>{state.pageSize=Number(e.target.value)||24;resetVisible();renderItems();});
  document.getElementById("loadMoreButton")?.addEventListener("click",()=>{state.visibleCount+=state.pageSize;renderItems();});
  document.getElementById("startButton")?.addEventListener("click",()=>document.getElementById("promptBuilderPanel")?.scrollIntoView({behavior:"smooth"}));
}
async function loadData(){
  try{
    const [cr,ir]=await Promise.all([fetch("./data/categories.json"),fetch("./data/items.json")]);
    if(!cr.ok||!ir.ok)throw new Error(`JSON 資料載入失敗（${cr.status}/${ir.status}）`);
    state.categories=await cr.json(); state.items=await ir.json();
    applyCounts(); renderCategories(); renderStatistics(); renderItems();
  }catch(error){
    console.error(error);
    const list=document.getElementById("itemList");
    if(list)list.innerHTML=`<p class="library-message error-message">${escapeHtml(error.message)}</p>`;
  }
}
function applyCounts(){
  const counts={}; state.items.forEach(i=>counts[i.category]=(counts[i.category]||0)+1);
  state.categories=state.categories.map(c=>({...c,count:counts[c.id]||0}));
}
function renderCategories(){
  const list=document.getElementById("categoryList"); if(!list)return; list.innerHTML="";
  state.categories.forEach(c=>{
    const li=document.createElement("li"),b=document.createElement("button");
    b.type="button"; b.className="category-button"; b.dataset.categoryId=c.id;
    b.innerHTML=`<span class="category-icon">${escapeHtml(c.icon)}</span><span class="category-label"><strong>${escapeHtml(c.name_zh)}</strong><small>${escapeHtml(c.name_en)}</small></span><span class="category-count">${c.count}</span>`;
    b.addEventListener("click",()=>state.activeCategoryId===c.id?clearCategory():selectCategory(c));
    li.appendChild(b); list.appendChild(li);
  });
}
function selectCategory(c){
  state.activeCategoryId=c.id; resetVisible(); updateCategoryButtons();
  setText("pageTitle",`${c.icon} ${c.name_zh}`); setText("pageDescription",c.description); renderItems();
  document.getElementById("libraryPanel")?.scrollIntoView({behavior:"smooth",block:"start"});
}
function clearCategory(){
  state.activeCategoryId=null; resetVisible(); updateCategoryButtons();
  setText("pageTitle","Welcome 👋"); setText("pageDescription","Build prompts for PixAI, Niji Journey, TensorArt and GPT Image."); renderItems();
}
function clearFilters(){
  state.activeCategoryId=null;state.searchQuery="";state.genderFilter="all";state.sortMode="category";state.pageSize=24;resetVisible();
  const input=document.querySelector(".search-box"); if(input)input.value="";
  [["genderFilter","all"],["sortMode","category"],["pageSize","24"]].forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v;});
  updateCategoryButtons(); setText("pageTitle","Welcome 👋"); setText("pageDescription","Build prompts for PixAI, Niji Journey, TensorArt and GPT Image."); renderItems();
}
function resetVisible(){state.visibleCount=state.pageSize;}
function updateCategoryButtons(){document.querySelectorAll(".category-button").forEach(b=>b.classList.toggle("active",b.dataset.categoryId===state.activeCategoryId));}
function matchesGender(item){
  if(state.genderFilter==="all")return true;
  if(state.genderFilter==="female")return ["female","unisex"].includes(item.gender);
  if(state.genderFilter==="male")return ["male","unisex"].includes(item.gender);
  return item.gender===state.genderFilter;
}
function matchesSearch(item){
  if(!state.searchQuery)return true;
  const tokens=state.searchQuery.split(/\s+/).filter(Boolean);
  const text=[item.name_zh,item.name_en,item.description_zh,item.description_en,item.gender,...Object.keys(item.anatomy||{}),...Object.values(item.anatomy||{}),...(item.tags||[]),...Object.values(item.prompts||{}),item.negative].join(" ").toLowerCase();
  return tokens.every(t=>text.includes(t));
}
function filteredItems(){
  const items=state.items.filter(i=>(!state.activeCategoryId||i.category===state.activeCategoryId)&&matchesGender(i)&&matchesSearch(i));
  const zh=new Intl.Collator("zh-Hant"),en=new Intl.Collator("en");
  const catIndex=new Map(state.categories.map((c,i)=>[c.id,i]));
  const sorters={
    category:(a,b)=>(catIndex.get(a.category)??999)-(catIndex.get(b.category)??999)||zh.compare(a.name_zh,b.name_zh),
    "name-zh":(a,b)=>zh.compare(a.name_zh,b.name_zh),
    "name-en":(a,b)=>en.compare(a.name_en,b.name_en),
    gender:(a,b)=>String(a.gender).localeCompare(String(b.gender))||zh.compare(a.name_zh,b.name_zh),
    "custom-first":(a,b)=>Number(!!b.custom)-Number(!!a.custom)||String(b.updated_at||"").localeCompare(String(a.updated_at||""))||zh.compare(a.name_zh,b.name_zh)
  };
  return items.sort(sorters[state.sortMode]||sorters.category);
}
function renderItems(){
  const list=document.getElementById("itemList"),summary=document.getElementById("resultSummary"),more=document.getElementById("loadMoreButton");
  if(!list)return;
  const all=filteredItems(),visible=all.slice(0,state.visibleCount),active=state.categories.find(c=>c.id===state.activeCategoryId);
  if(summary)summary.textContent=`${active?active.name_zh:"全部分類"}：找到 ${all.length} 筆，目前顯示 ${visible.length} 筆`;
  renderFilterSummary(active);
  if(!all.length){list.innerHTML=`<p class="library-message">找不到符合條件的資料。請更換分類、適用類型或搜尋詞。</p>`;if(more)more.hidden=true;return;}
  list.innerHTML="";visible.forEach(i=>list.appendChild(createCard(i)));
  if(more){const remain=all.length-visible.length;more.hidden=remain<=0;more.textContent=`載入更多（尚有 ${remain} 筆）`;}
}
function renderFilterSummary(active){
  const box=document.getElementById("activeFilterSummary");if(!box)return;
  const chips=[];if(active)chips.push(`分類：${active.name_zh}`);if(state.searchQuery)chips.push(`搜尋：${state.searchQuery}`);
  const labels={female:"女裝＋中性",male:"男裝＋中性",unisex:"僅男女皆可",none:"通用元素"};
  if(state.genderFilter!=="all")chips.push(`適用：${labels[state.genderFilter]}`);
  box.innerHTML=chips.length?chips.map(x=>`<span class="active-filter-chip">${escapeHtml(x)}</span>`).join(""):`<span class="filter-empty-state">目前未套用額外篩選</span>`;
}
function createCard(item){
  const article=document.createElement("article");article.className="prompt-card";article.dataset.itemId=item.id;
  const c=state.categories.find(x=>x.id===item.category);
  const anatomy=Object.entries(item.anatomy||{}).map(([k,v])=>`<div class="anatomy-row"><dt>${escapeHtml(formatLabel(k))}</dt><dd>${escapeHtml(v)}</dd></div>`).join("");
  const tags=(item.tags||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("");
  article.innerHTML=`
    <div class="prompt-card-header"><div><p class="card-category">${escapeHtml(c?.icon||"✦")} ${escapeHtml(c?.name_zh||item.category)} ${item.custom?'<span class="custom-source-chip">自訂</span>':""}</p><h3>${escapeHtml(item.name_zh)}</h3><p class="english-name">${escapeHtml(item.name_en)}</p></div><span class="gender-chip">${escapeHtml(genderLabel(item.gender))}</span></div>
    <p class="item-description">${escapeHtml(item.description_zh)}</p><div class="tag-list">${tags}</div>
    <details class="item-details"><summary>查看結構與完整提示詞</summary><div class="detail-content">
      <section><h4>結構說明</h4><dl class="anatomy-list">${anatomy||"<p>尚未設定結構欄位。</p>"}</dl></section>
      <section><h4>英文描述</h4><p>${escapeHtml(item.description_en)}</p></section>
      ${promptSection("PixAI",item.prompts?.pixai||"")}${promptSection("Niji",item.prompts?.niji||"")}${promptSection("TensorArt",item.prompts?.tensorart||"")}${promptSection("GPT Image",item.prompts?.gpt||"")}
      <section><h4>Negative Prompt</h4><p>${escapeHtml(item.negative||"")}</p><button class="copy-button" type="button" data-copy="${escapeAttribute(item.negative||"")}">複製 Negative</button></section>
    </div></details>`;
  article.querySelectorAll(".copy-button").forEach(b=>b.addEventListener("click",()=>copyText(b.dataset.copy||"")));
  return article;
}
function promptSection(label,text){return `<section class="prompt-section"><div class="prompt-section-heading"><h4>${label}</h4><button class="copy-button" type="button" data-copy="${escapeAttribute(text)}" ${text?"":"disabled"}>複製</button></div><p class="prompt-text">${text?escapeHtml(text):"尚未提供此平台提示詞。"}</p></section>`;}
function renderStatistics(){
  const list=document.getElementById("statsList");if(!list)return;
  const custom=state.items.filter(i=>i.custom).length;
  list.innerHTML=`<li>分類數量<span>${state.categories.length}</span></li><li>全部資料<span>${state.items.length}</span></li><li>自訂資料<span>${custom}</span></li><li>支援平台<span>4</span></li><li>App 版本<span>${APP.version}</span></li>`;
}
async function copyText(text){
  if(!text){toast("目前沒有可複製的內容");return;}
  try{await navigator.clipboard.writeText(text);}catch{const t=document.createElement("textarea");t.value=text;t.style.position="fixed";t.style.opacity="0";document.body.appendChild(t);t.select();document.execCommand("copy");t.remove();}
  toast("提示詞已複製");
}
function toast(message){let t=document.getElementById("appToast");if(!t){t=document.createElement("div");t.id="appToast";t.className="app-toast";document.body.appendChild(t);}t.textContent=message;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),1800);}
function genderLabel(g){return {female:"女裝",male:"男裝",unisex:"男女皆可",none:"通用元素"}[g]||g;}
function formatLabel(s){return s.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase());}
function setText(id,text){const el=document.getElementById(id);if(el)el.textContent=text;}
function escapeHtml(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function escapeAttribute(v=""){return escapeHtml(v).replaceAll("\n","&#10;").replaceAll("\r","&#13;");}

if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.error));}
