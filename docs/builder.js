// 2Y Prompt Builder v0.5.0
(() => {
  const STORAGE_KEY = '2y-builder-v1';
  const state = { categories: [], items: [], selected: [], platform: 'pixai' };

  document.addEventListener('DOMContentLoaded', async () => {
    injectBuilder();
    bindControls();
    bindQuickButtons();
    restore();
    await loadData();
  });

  function injectBuilder() {
    if (document.getElementById('promptBuilderPanel')) return;
    const content = document.querySelector('.content');
    if (!content) return;

    const panel = document.createElement('section');
    panel.id = 'promptBuilderPanel';
    panel.className = 'builder-panel';
    panel.innerHTML = `
      <div class="builder-heading">
        <div>
          <p class="builder-eyebrow">PROMPT BUILDER</p>
          <h2>提示詞組合器</h2>
          <p>選擇服飾、配件、姿勢、場景、鏡頭與光線，自動組合平台提示詞。</p>
        </div>
        <span class="builder-badge">v0.5.0</span>
      </div>

      <div class="builder-layout">
        <div class="builder-controls">
          <label class="builder-field">
            <span>輸出平台</span>
            <select id="builderPlatform">
              <option value="pixai">PixAI</option>
              <option value="niji">Niji Journey</option>
              <option value="tensorart">TensorArt</option>
              <option value="gpt">GPT Image</option>
            </select>
          </label>

          <label class="builder-field">
            <span>分類</span>
            <select id="builderCategory">
              <option value="">正在載入分類……</option>
            </select>
          </label>

          <label class="builder-field">
            <span>項目</span>
            <select id="builderItem" disabled>
              <option value="">請先選擇分類</option>
            </select>
          </label>

          <button id="builderAdd" class="builder-primary" type="button" disabled>＋ 加入提示詞</button>
          <button id="builderRandom" class="builder-secondary" type="button">🎲 隨機加入一項</button>
        </div>

        <div class="builder-workspace">
          <div class="builder-section-heading">
            <h3>目前選擇</h3>
            <button id="builderClear" class="builder-text-button" type="button">全部清除</button>
          </div>

          <div id="builderSelection" class="builder-selection" aria-live="polite">
            <p class="builder-empty">尚未加入任何項目。</p>
          </div>

          <label class="builder-output-field">
            <span>生成 Prompt</span>
            <textarea id="builderPrompt" rows="8" readonly placeholder="加入項目後，提示詞會顯示在這裡。"></textarea>
          </label>
          <div class="builder-actions">
            <button id="builderCopyPrompt" class="builder-copy" type="button">📋 複製 Prompt</button>
          </div>

          <label class="builder-output-field">
            <span>Negative Prompt</span>
            <textarea id="builderNegative" rows="5" readonly placeholder="加入項目後，Negative Prompt 會顯示在這裡。"></textarea>
          </label>
          <div class="builder-actions">
            <button id="builderCopyNegative" class="builder-copy secondary" type="button">📋 複製 Negative</button>
          </div>
        </div>
      </div>`;

    content.appendChild(panel);
  }

  function bindControls() {
    $('#builderPlatform')?.addEventListener('change', e => {
      state.platform = e.target.value;
      save();
      renderOutputs();
    });

    $('#builderCategory')?.addEventListener('change', e => {
      populateItems(e.target.value);
    });

    $('#builderItem')?.addEventListener('change', e => {
      $('#builderAdd').disabled = !e.target.value;
    });

    $('#builderAdd')?.addEventListener('click', () => {
      const id = $('#builderItem')?.value;
      if (id) addItem(id);
    });

    $('#builderRandom')?.addEventListener('click', addRandom);
    $('#builderClear')?.addEventListener('click', clearAll);
    $('#builderCopyPrompt')?.addEventListener('click', () => copyText($('#builderPrompt')?.value, 'Prompt 已複製'));
    $('#builderCopyNegative')?.addEventListener('click', () => copyText($('#builderNegative')?.value, 'Negative Prompt 已複製'));
  }

  function bindQuickButtons() {
    document.querySelectorAll('button').forEach(button => {
      const label = button.textContent.trim().toLowerCase();
      if (button.id === 'startButton' || label === 'prompt builder') {
        button.addEventListener('click', () => {
          $('#promptBuilderPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    });
  }

  async function loadData() {
    try {
      const [categoryResponse, itemResponse] = await Promise.all([
        fetch('./data/categories.json'),
        fetch('./data/items.json')
      ]);
      if (!categoryResponse.ok || !itemResponse.ok) throw new Error('提示詞資料載入失敗');
      state.categories = await categoryResponse.json();
      state.items = await itemResponse.json();
      populateCategories();
      state.selected = state.selected.filter(id => state.items.some(item => item.id === id));
      save();
      renderSelection();
      renderOutputs();
    } catch (error) {
      console.error(error);
      $('#builderCategory').innerHTML = '<option value="">資料載入失敗</option>';
    }
  }

  function populateCategories() {
    const select = $('#builderCategory');
    const available = new Set(state.items.map(item => item.category));
    select.innerHTML = '<option value="">請選擇分類</option>' + state.categories
      .filter(category => available.has(category.id))
      .map(category => `<option value="${esc(category.id)}">${esc(category.icon)} ${esc(category.name_zh)}</option>`)
      .join('');
    $('#builderPlatform').value = state.platform;
  }

  function populateItems(categoryId) {
    const select = $('#builderItem');
    const add = $('#builderAdd');
    if (!categoryId) {
      select.disabled = true;
      select.innerHTML = '<option value="">請先選擇分類</option>';
      add.disabled = true;
      return;
    }
    const items = state.items.filter(item => item.category === categoryId);
    select.disabled = false;
    select.innerHTML = '<option value="">請選擇項目</option>' + items
      .map(item => `<option value="${esc(item.id)}">${esc(item.name_zh)} — ${esc(item.name_en)}</option>`)
      .join('');
    add.disabled = true;
  }

  function addItem(id) {
    if (state.selected.includes(id)) {
      toast('這個項目已經加入');
      return;
    }
    state.selected.push(id);
    save();
    renderSelection();
    renderOutputs();
    const item = state.items.find(entry => entry.id === id);
    toast(`${item?.name_zh || '項目'}已加入`);
  }

  function addRandom() {
    const candidates = state.items.filter(item => !state.selected.includes(item.id));
    if (!candidates.length) return toast('沒有可再加入的項目');
    addItem(candidates[Math.floor(Math.random() * candidates.length)].id);
  }

  function removeItem(id) {
    state.selected = state.selected.filter(itemId => itemId !== id);
    save();
    renderSelection();
    renderOutputs();
  }

  function clearAll() {
    state.selected = [];
    save();
    renderSelection();
    renderOutputs();
    toast('已清除全部項目');
  }

  function selectedItems() {
    return state.selected.map(id => state.items.find(item => item.id === id)).filter(Boolean);
  }

  function renderSelection() {
    const container = $('#builderSelection');
    const items = selectedItems();
    if (!items.length) {
      container.innerHTML = '<p class="builder-empty">尚未加入任何項目。</p>';
      return;
    }
    container.innerHTML = items.map(item => {
      const category = state.categories.find(entry => entry.id === item.category);
      return `
        <div class="builder-selected-item">
          <span>${esc(category?.icon || '✦')}</span>
          <span class="builder-selected-label"><strong>${esc(item.name_zh)}</strong><small>${esc(item.name_en)}</small></span>
          <button class="builder-remove" type="button" data-remove="${esc(item.id)}" aria-label="移除">×</button>
        </div>`;
    }).join('');
    container.querySelectorAll('[data-remove]').forEach(button => {
      button.addEventListener('click', () => removeItem(button.dataset.remove));
    });
  }

  function renderOutputs() {
    const items = selectedItems();
    const prompts = unique(items.map(item => item.prompts?.[state.platform]).filter(Boolean));
    const negativeTerms = [];
    items.map(item => item.negative).filter(Boolean).join(',').split(',').forEach(term => {
      const value = term.trim();
      if (value && !negativeTerms.some(existing => existing.toLowerCase() === value.toLowerCase())) negativeTerms.push(value);
    });
    $('#builderPrompt').value = prompts.join(',\n');
    $('#builderNegative').value = negativeTerms.join(', ');
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ selected: state.selected, platform: state.platform }));
  }

  function restore() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(stored?.selected)) state.selected = stored.selected;
      if (['pixai', 'niji', 'tensorart', 'gpt'].includes(stored?.platform)) state.platform = stored.platform;
    } catch (error) {
      console.warn('無法還原 Prompt Builder 狀態', error);
    }
  }

  async function copyText(text, message) {
    if (!text) return toast('目前沒有可複製的內容');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    toast(message);
  }

  function toast(message) {
    let node = $('#builderToast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'builderToast';
      node.className = 'builder-toast';
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 1800);
  }

  function unique(values) {
    const seen = new Set();
    return values.filter(value => {
      const key = value.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function $(selector) { return document.querySelector(selector); }
  function esc(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
})();
