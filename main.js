// State management
const state = {
    selectedMap: null,
    selectedSide: null,
    selectedSite: null,
    selectedRoles: new Set(),
    searchQuery: '',
    mapsList: [],
    mapsCache: {},
    modalOperator: null   // 彈窗顯示的幹員名稱
};

const MAP_IDS = [
    'bank','border','chalet','clubhouse','coastline',
    'consulate','emerald','favela','fortress',
    'house','kafe','kanal','lair','nighthaven','oregon','outback',
    'plane','skyscraper','stadium-a','stadium-b','themepark','tower',
    'villa','yacht'
];

async function loadData() {
    try {
        const mapPreviews = await Promise.all(
            MAP_IDS.map(id =>
                fetch(`./data/maps/${id}.json`)
                    .then(r => r.json())
                    .then(data => ({
                        id: data.id,
                        name: data.name,
                        nameEN: data.nameEN,
                        aliases: data.aliases || []
                    }))
            )
        );
        state.mapsList = mapPreviews;
        render();
    } catch (error) {
        console.error('Error loading data:', error);
        renderError('資料載入失敗，請重新整理頁面。');
    }
}

async function loadFullMap(mapId) {
    if (state.mapsCache[mapId]) return state.mapsCache[mapId];
    const res = await fetch(`./data/maps/${mapId}.json`);
    const data = await res.json();
    state.mapsCache[mapId] = data;
    return data;
}

function renderError(message) {
    document.getElementById('app').innerHTML = `
        <div class="container">
            <div class="header"><h1>R6 戰術選角助手</h1></div>
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <p>${message}</p>
            </div>
        </div>`;
}

// ─── Main render ───────────────────────────────────────────────
function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="container">
            ${renderHeader()}
            <div class="layout">
                <div class="left-panel">
                    ${renderMapSelection()}
                    ${state.selectedMap ? renderSideAndSiteSelection() : ''}
                </div>
                <div class="right-panel" id="rightPanel">
                    ${renderResults()}
                </div>
            </div>
        </div>
    `;
    attachEventListeners();
}

// ─── Header ────────────────────────────────────────────────────
function renderHeader() {
    return `
        <div class="header">
            <h1>R6 戰術選角助手</h1>
            <p>選擇地圖、陣營與點位，點擊幹員查看任務詳情</p>
        </div>`;
}

// ─── Map Selection ─────────────────────────────────────────────
function getFilteredMaps() {
    return state.mapsList.filter(map => {
        if (!state.searchQuery) return true;
        const q = state.searchQuery.toLowerCase();
        return (
            map.name.toLowerCase().includes(q) ||
            map.nameEN.toLowerCase().includes(q) ||
            (map.aliases && map.aliases.some(a => a.toLowerCase().includes(q)))
        );
    });
}

function renderMapsGrid() {
    const maps = getFilteredMaps();
    if (!maps.length) return `
        <div class="empty-state" id="mapsGrid">
            <div class="empty-state-icon">🔍</div>
            <p>找不到符合的地圖</p>
        </div>`;
    return `
        <div class="maps-grid" id="mapsGrid">
            ${maps.map(m => `
                <div class="map-card ${state.selectedMap?.id === m.id ? 'selected' : ''}" data-map-id="${m.id}">
                    <h3>${m.name}</h3>
                    <p>${m.nameEN}</p>
                </div>`).join('')}
        </div>`;
}

function renderMapSelection() {
    return `
        <div class="section">
            <div class="section-title">步驟 1：選擇地圖</div>
            <div class="search-box">
                <input type="text" class="search-input" id="mapSearch"
                    placeholder="搜尋地圖名稱..." autocomplete="off" />
            </div>
            ${renderMapsGrid()}
        </div>`;
}

// ─── Side / Site ───────────────────────────────────────────────
function renderSideAndSiteSelection() {
    const sites = state.selectedMap?.sites || [];
    return `
        <div class="section">
            <div class="section-title">步驟 2：選擇陣營與點位</div>
            <div class="side-site-container">
                <div class="side-buttons">
                    <button class="side-btn ${state.selectedSide === 'attack' ? 'selected' : ''}" data-side="attack">🔴 攻擊</button>
                    <button class="side-btn ${state.selectedSide === 'defense' ? 'selected' : ''}" data-side="defense">🔵 防守</button>
                </div>
                <div class="sites-list">
                    ${sites.map(s => `
                        <button class="site-btn ${state.selectedSite === s.id ? 'selected' : ''}" data-site="${s.id}">
                            ${s.name}
                        </button>`).join('')}
                </div>
            </div>
        </div>`;
}

// ─── Right panel ───────────────────────────────────────────────
function renderResults() {
    if (!state.selectedMap || !state.selectedSide || !state.selectedSite) {
        const steps = [
            { done: !!state.selectedMap,  label: state.selectedMap ? `地圖：${state.selectedMap.name}` : '選擇地圖' },
            { done: !!state.selectedSide, label: state.selectedSide ? (state.selectedSide === 'attack' ? '🔴 攻擊' : '🔵 防守') : '選擇陣營' },
            { done: !!state.selectedSite, label: '選擇炸彈點' },
        ];
        return `
            <div class="result-placeholder">
                <div class="placeholder-icon">🎯</div>
                <p class="placeholder-title">完成左側選擇以查看推薦</p>
                <ul class="placeholder-steps">
                    ${steps.map(s => `
                        <li class="${s.done ? 'done' : ''}">
                            <span class="step-check">${s.done ? '✓' : '○'}</span>
                            ${s.label}
                        </li>`).join('')}
                </ul>
            </div>`;
    }

    const tactics = findTactics(state.selectedMap.id, state.selectedSide, state.selectedSite);
    if (!tactics) return `
        <div class="result-placeholder">
            <div class="placeholder-icon">📋</div>
            <p>此組合暫無推薦戰術</p>
        </div>`;

    const siteObj = state.selectedMap.sites.find(s => s.id === state.selectedSite);
    const siteLabel = siteObj ? siteObj.name : state.selectedSite;

    const allRoles = [];
    (tactics.operators || []).forEach(op => {
        (op.roles || []).forEach(r => { if (!allRoles.includes(r)) allRoles.push(r); });
    });

    const filtered = state.selectedRoles.size === 0
        ? tactics.operators
        : (tactics.operators || []).filter(op => (op.roles || []).some(r => state.selectedRoles.has(r)));

    return `
        <div class="results-topbar">
            <div class="results-header">
                <span class="result-tag">${state.selectedMap.name}</span>
                <span class="result-tag ${state.selectedSide}">${state.selectedSide === 'attack' ? '🔴 攻擊' : '🔵 防守'}</span>
                <span class="result-tag">${siteLabel}</span>
            </div>
        </div>
        <div id="operatorsSection">
            ${renderRoleFilterBar(allRoles)}
            ${renderOperatorsGrid(filtered || [])}
        </div>`;
}

// ─── Role filter bar ───────────────────────────────────────────
function renderRoleFilterBar(allRoles) {
    if (!allRoles.length) return '';
    return `
        <div class="role-filter-bar">
            <button class="role-filter-btn ${state.selectedRoles.size === 0 ? 'active' : ''}" data-role="__all__">全部</button>
            ${allRoles.map(r => `
                <button class="role-filter-btn ${state.selectedRoles.has(r) ? 'active' : ''}" data-role="${r}">${r}</button>
            `).join('')}
        </div>
        ${state.selectedRoles.size > 0
            ? `<div class="filter-hint">已篩選：${[...state.selectedRoles].join('、')}　<span class="ctrl-hint">Ctrl+點擊 可多選</span></div>`
            : `<div class="filter-hint ctrl-hint">點擊幹員查看任務詳情　Ctrl+點擊標籤可多選</div>`}`;
}

// ─── Operators grid — 緊湊卡片，點擊開 modal ──────────────────
function renderOperatorsGrid(operators) {
    if (!operators.length) return `
        <div class="empty-state">
            <div class="empty-state-icon">👤</div>
            <p>暫無符合幹員</p>
        </div>`;
    return `
        <div class="operators-grid" id="operatorsGrid">
            ${operators.map(op => `
                <div class="operator-card" data-op-name="${op.name}">
                    <div class="op-card-header">
                        <div class="operator-name">${op.name}</div>
                        <div class="operator-roles">
                            ${(op.roles || []).map(r => `<span class="role-tag">${r}</span>`).join('')}
                        </div>
                    </div>
                    <div class="operator-mission-preview">${op.reason}</div>
                    <div class="op-card-footer">▾ 查看任務</div>
                </div>`).join('')}
        </div>`;
}

// ─── Operator Modal — 幾乎全螢幕三欄 ──────────────────────────
function renderOperatorModal(op, tactics) {
    const siteObj = state.selectedMap?.sites?.find(s => s.id === state.selectedSite);
    const siteLabel = siteObj ? siteObj.name : '';
    const sideLabel = state.selectedSide === 'attack' ? '🔴 攻擊' : '🔵 防守';

    // 左欄：主要任務 + 常見錯誤
    const tasksHTML = tactics.topTasks?.length ? `
        <div class="col-block">
            <div class="col-block-title tasks-title">🎯 主要任務</div>
            <ul class="tasks-list">
                ${tactics.topTasks.map((t, i) => `<li data-num="${i+1}">${t}</li>`).join('')}
            </ul>
        </div>` : '';

    const mistakesHTML = tactics.commonMistakes?.length ? `
        <div class="col-block">
            <div class="col-block-title mistakes-title">⚠️ 常見錯誤</div>
            <ul class="mistakes-list">
                ${tactics.commonMistakes.map(m => `<li>${m}</li>`).join('')}
            </ul>
        </div>` : '';

    // 中欄：幹員任務定位 + tips
    const midHTML = `
        <div class="col-block">
            <div class="col-block-title op-title">👤 ${op.name} 這場任務</div>
            <div class="op-modal-mission">${op.reason}</div>
            ${op.tips?.length ? `
                <div class="op-tips-label">執行重點</div>
                <ul class="tips-list-inline">
                    ${op.tips.map(t => `<li>${t}</li>`).join('')}
                </ul>` : ''}
            ${op.alternatives?.length ? `
                <div class="operator-alternatives">
                    <span class="alternatives-label">替代：</span>${op.alternatives.join('、')}
                </div>` : ''}
        </div>`;

    // 右欄：點位通用技巧 + 影片資源（可編輯）
    const generalTips = tactics.generalTips || [];
    if (!tactics.videos) tactics.videos = [];   // 確保陣列存在

    const rightHTML = `
        <div class="col-block">
            <div class="col-block-title general-title">💡 點位通用技巧</div>
            ${generalTips.length ? `
                <ul class="general-tips-list">
                    ${generalTips.map(t => `<li>${t}</li>`).join('')}
                </ul>` : `
                <p class="no-data-hint">尚未加入通用技巧</p>`}
        </div>
        <div class="col-block" id="videoEditBlock">
            <div class="col-block-title video-title">
                🎬 精選影片
                <button class="video-add-btn" id="videoAddBtn">＋ 新增</button>
            </div>
            <div class="video-list" id="videoList">
                <!-- rendered by refreshVideoList() -->
            </div>
            <div class="video-add-form" id="videoAddForm" style="display:none;">
                <input class="video-form-input" id="videoFormTitle" type="text" placeholder="影片標題" autocomplete="off" />
                <input class="video-form-input" id="videoFormUrl" type="text" placeholder="YouTube 網址" autocomplete="off" />
                <div class="video-form-actions">
                    <button class="video-form-confirm" id="videoFormConfirm">✔ 新增</button>
                    <button class="video-form-cancel" id="videoFormCancel">✕ 取消</button>
                </div>
            </div>
        </div>`;

    return `
        <div class="op-modal-overlay" id="opModalOverlay">
            <div class="op-modal" id="opModal">
                <div class="op-modal-topbar">
                    <div class="op-modal-context">
                        <span class="op-modal-opname">${op.name}</span>
                        <span class="op-modal-roles-inline">
                            ${(op.roles || []).map(r => `<span class="role-tag">${r}</span>`).join('')}
                        </span>
                        <span class="op-modal-meta">${state.selectedMap?.name} · ${sideLabel} · ${siteLabel}</span>
                    </div>
                    <button class="op-modal-close" id="opModalClose">✕</button>
                </div>
                <div class="op-three-col">
                    <div class="op-col op-col-left">
                        ${tasksHTML}
                        ${mistakesHTML}
                    </div>
                    <div class="op-col op-col-mid">
                        ${midHTML}
                    </div>
                    <div class="op-col op-col-right">
                        ${rightHTML}
                    </div>
                </div>
            </div>
        </div>`;
}

// ─── Video edit helpers ────────────────────────────────────────

/** localStorage key for video edits */
function videoStorageKey() {
    return `r6v|${state.selectedMap?.id}|${state.selectedSite}|${state.selectedSide}`;
}

/** Persist current tactics.videos to localStorage */
function saveVideosToStorage(videos) {
    try {
        localStorage.setItem(videoStorageKey(), JSON.stringify(videos));
    } catch(e) { /* ignore quota errors */ }
}

/** Load persisted videos (if any) and merge into tactics object */
function loadVideosFromStorage(tactics) {
    try {
        const raw = localStorage.getItem(videoStorageKey());
        if (raw) {
            tactics.videos = JSON.parse(raw);
        }
    } catch(e) { /* ignore */ }
}

/** YouTube thumbnail helper */
function ytThumb(url) {
    const m = url.match(/(?:youtu\.be\/|v=|\/v\/|embed\/)([A-Za-z0-9_-]{11})/);
    return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : null;
}

/** Re-render the video list inside #videoList */
function refreshVideoList(videos) {
    const list = document.getElementById('videoList');
    if (!list) return;
    if (!videos.length) {
        list.innerHTML = `<p class="no-data-hint">尚未加入影片</p>`;
        return;
    }
    list.innerHTML = videos.map((v, i) => {
        const thumb = ytThumb(v.url);
        return `
            <div class="video-card-editable">
                <a class="video-card" href="${v.url}" target="_blank" rel="noopener">
                    ${thumb
                        ? `<img class="video-thumb" src="${thumb}" alt="" loading="lazy">`
                        : `<div class="video-thumb-placeholder">▶</div>`}
                    <div class="video-card-title">${escapeHtml(v.title)}</div>
                </a>
                <button class="video-delete-btn" data-idx="${i}" title="刪除此影片">✕</button>
            </div>`;
    }).join('');

    list.querySelectorAll('.video-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx, 10);
            const tactics = findTactics(state.selectedMap?.id, state.selectedSide, state.selectedSite);
            if (!tactics) return;
            tactics.videos.splice(idx, 1);
            saveVideosToStorage(tactics.videos);
            refreshVideoList(tactics.videos);
        });
    });
}

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** Bind add-form interactions */
function bindVideoEditEvents(tactics) {
    refreshVideoList(tactics.videos);

    const addBtn     = document.getElementById('videoAddBtn');
    const addForm    = document.getElementById('videoAddForm');
    const titleInput = document.getElementById('videoFormTitle');
    const urlInput   = document.getElementById('videoFormUrl');
    const confirmBtn = document.getElementById('videoFormConfirm');
    const cancelBtn  = document.getElementById('videoFormCancel');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
        addForm.style.display = addForm.style.display === 'none' ? 'block' : 'none';
        if (addForm.style.display === 'block') titleInput.focus();
    });

    cancelBtn.addEventListener('click', () => {
        addForm.style.display = 'none';
        titleInput.value = '';
        urlInput.value = '';
    });

    const doConfirm = () => {
        const title = titleInput.value.trim();
        const url   = urlInput.value.trim();
        if (!title || !url) {
            titleInput.classList.toggle('input-error', !title);
            urlInput.classList.toggle('input-error', !url);
            return;
        }
        titleInput.classList.remove('input-error');
        urlInput.classList.remove('input-error');
        tactics.videos.push({ title, url });
        saveVideosToStorage(tactics.videos);
        refreshVideoList(tactics.videos);
        titleInput.value = '';
        urlInput.value = '';
        addForm.style.display = 'none';
    };

    confirmBtn.addEventListener('click', doConfirm);

    // Enter key in inputs triggers confirm
    [titleInput, urlInput].forEach(inp => {
        inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doConfirm();
            if (e.key === 'Escape') cancelBtn.click();
        });
    });
}

// ─── Modal 開關 ────────────────────────────────────────────────
function openOperatorModal(opName) {
    const tactics = findTactics(state.selectedMap?.id, state.selectedSide, state.selectedSite);
    if (!tactics) return;
    const op = (tactics.operators || []).find(o => o.name === opName);
    if (!op) return;

    // 載入 localStorage 中的影片編輯
    if (!tactics.videos) tactics.videos = [];
    loadVideosFromStorage(tactics);

    document.getElementById('opModalOverlay')?.remove();
    state.modalOperator = opName;
    document.body.insertAdjacentHTML('beforeend', renderOperatorModal(op, tactics));

    const overlay = document.getElementById('opModalOverlay');
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeOperatorModal();
    });
    document.getElementById('opModalClose').addEventListener('click', closeOperatorModal);

    document._opModalEscHandler = (e) => {
        if (e.key === 'Escape') closeOperatorModal();
    };
    document.addEventListener('keydown', document._opModalEscHandler);

    // 綁定影片編輯事件
    bindVideoEditEvents(tactics);
}

function closeOperatorModal() {
    document.getElementById('opModalOverlay')?.remove();
    document.removeEventListener('keydown', document._opModalEscHandler);
    state.modalOperator = null;
}

// ─── Utility ───────────────────────────────────────────────────
function findTactics(mapId, side, siteId) {
    const map = state.selectedMap;
    if (!map) return null;
    const site = map.sites.find(s => s.id === siteId);
    if (site && site[side]) return site[side];
    if (map.generalTactics?.[side]) return map.generalTactics[side];
    return null;
}

// ─── Event listeners ──────────────────────────────────────────
function attachEventListeners() {
    document.querySelectorAll('.map-card').forEach(card => {
        card.addEventListener('click', async (e) => {
            closeOperatorModal();
            const mapId = e.currentTarget.dataset.mapId;
            state.selectedSide = null;
            state.selectedSite = null;
            state.selectedRoles = new Set();
            const fullMap = await loadFullMap(mapId);
            state.selectedMap = fullMap;
            render();
        });
    });

    const searchInput = document.getElementById('mapSearch');
    if (searchInput) {
        searchInput.value = state.searchQuery;
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            const grid = document.getElementById('mapsGrid');
            if (grid) {
                grid.outerHTML = renderMapsGrid();
                bindMapCards();
            }
        });
    }

    document.querySelectorAll('.side-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeOperatorModal();
            state.selectedSide = e.target.dataset.side;
            state.selectedSite = null;
            state.selectedRoles = new Set();
            render();
        });
    });

    document.querySelectorAll('.site-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeOperatorModal();
            state.selectedSite = e.currentTarget.dataset.site;
            state.selectedRoles = new Set();
            render();
        });
    });

    attachRoleFilterListeners();
    bindOperatorCards();
}

function bindMapCards() {
    document.querySelectorAll('.map-card').forEach(card => {
        card.addEventListener('click', async (e) => {
            closeOperatorModal();
            const mapId = e.currentTarget.dataset.mapId;
            state.selectedSide = null;
            state.selectedSite = null;
            state.selectedRoles = new Set();
            const fullMap = await loadFullMap(mapId);
            state.selectedMap = fullMap;
            render();
        });
    });
}

function bindOperatorCards() {
    document.querySelectorAll('.operator-card').forEach(card => {
        card.addEventListener('click', () => openOperatorModal(card.dataset.opName));
    });
}

function attachRoleFilterListeners() {
    document.querySelectorAll('.role-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const role = e.currentTarget.dataset.role;
            const isMulti = e.ctrlKey || e.metaKey;

            if (role === '__all__') {
                state.selectedRoles = new Set();
            } else if (isMulti) {
                if (state.selectedRoles.has(role)) {
                    state.selectedRoles.delete(role);
                } else {
                    state.selectedRoles.add(role);
                }
            } else {
                if (state.selectedRoles.size === 1 && state.selectedRoles.has(role)) {
                    state.selectedRoles = new Set();
                } else {
                    state.selectedRoles = new Set([role]);
                }
            }

            refreshOperatorsSection();
        });
    });
}

function refreshOperatorsSection() {
    const section = document.getElementById('operatorsSection');
    if (!section) return;
    const tactics = findTactics(state.selectedMap.id, state.selectedSide, state.selectedSite);
    const allRoles = [];
    (tactics?.operators || []).forEach(op => {
        (op.roles || []).forEach(r => { if (!allRoles.includes(r)) allRoles.push(r); });
    });
    const filtered = state.selectedRoles.size === 0
        ? tactics?.operators
        : (tactics?.operators || []).filter(op => (op.roles || []).some(r => state.selectedRoles.has(r)));
    section.innerHTML = renderRoleFilterBar(allRoles) + renderOperatorsGrid(filtered || []);
    attachRoleFilterListeners();
    bindOperatorCards();
}

// Initialize
loadData();
