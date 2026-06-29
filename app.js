// DOM Elements
const elTotalParticipants = document.getElementById('total-participants');
const elBtnUpdateParticipants = document.getElementById('btn-update-participants');
const elExcludeNumber = document.getElementById('exclude-number');
const elBtnAddExclude = document.getElementById('btn-add-exclude');
const elExcludedList = document.getElementById('excluded-list');
const elBtnReset = document.getElementById('btn-reset');
const elStatRemaining = document.getElementById('stat-remaining');
const elBtnStart = document.getElementById('btn-start');
const elBtnStop = document.getElementById('btn-stop');
const elLotteryArena = document.getElementById('lottery-arena');
const elWinnerDisplay = document.getElementById('winner-display');
const elWinnerNumber = document.getElementById('winner-number');
const elHistoryList = document.getElementById('history-list');
const elSettingsPanel = document.getElementById('settings-panel');
const elBtnToggleSettings = document.getElementById('btn-toggle-settings');
const elBtnCloseSettings = document.getElementById('btn-close-settings');
const elAppTitleInput = document.getElementById('app-title-input');
const elThemeColorInput = document.getElementById('theme-color-input');
const elAppTitleDisplay = document.getElementById('app-title-display');
const elSearchHistory = document.getElementById('search-history');
const elBtnExport = document.getElementById('btn-export');
const elBtnFullscreen = document.getElementById('btn-fullscreen');

// State
let state = {
    totalParticipants: 100,
    excludedNumbers: [],
    drawnHistory: [],
    prizesGiven: [],
    appTitle: ' ',
    themeColor: '#8b5cf6'
};

// Animation variables
let animationFrameId = null;
let floatingElements = [];
let arenaRect = null;
const MAX_FLOATING_ELEMENTS = 60; // Max DOM elements to animate for performance

// Initialization
function init() {
    loadState();
    updateUI();
    setupEventListeners();
    
    // Update arena size on resize
    window.addEventListener('resize', () => {
        if (elLotteryArena) {
            arenaRect = elLotteryArena.getBoundingClientRect();
        }
    });
}

// Storage
function loadState() {
    const saved = localStorage.getItem('matsuriLotteryState');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
        } catch (e) {
            console.error('Failed to load state', e);
        }
    }
}

function saveState() {
    localStorage.setItem('matsuriLotteryState', JSON.stringify(state));
    updateUI();
}

// UI Updates
function applyThemeColor(hex) {
    document.documentElement.style.setProperty('--primary-color', hex);
    if(hex.length === 7) {
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);
        }
    }
}

function updateUI() {
    elTotalParticipants.value = state.totalParticipants;
    if (elAppTitleInput) elAppTitleInput.value = state.appTitle || ' ';
    if (elThemeColorInput) elThemeColorInput.value = state.themeColor || '#8b5cf6';
    if (elAppTitleDisplay) elAppTitleDisplay.textContent = state.appTitle || ' ';
    applyThemeColor(state.themeColor || '#8b5cf6');
    
    renderExcludedList();
    renderHistoryList();
    updateRemainingCount();
}

function renderExcludedList() {
    elExcludedList.innerHTML = '';
    state.excludedNumbers.forEach(num => {
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.innerHTML = `
            ${num}
            <button onclick="removeExclude(${num})">&times;</button>
        `;
        elExcludedList.appendChild(tag);
    });
}

function renderHistoryList(searchQuery = '') {
    elHistoryList.innerHTML = '';
    const query = searchQuery.trim();
    
    [...state.drawnHistory].reverse().forEach((num, index) => {
        // If searching, skip non-matching
        if (query && num.toString() !== query) {
            return;
        }
        
        const li = document.createElement('li');
        li.className = 'history-item';
        const isGiven = state.prizesGiven && state.prizesGiven.includes(num);
        if (isGiven) {
            li.classList.add('given');
        }
        
        const actualOrder = state.drawnHistory.length - index;
        li.innerHTML = `<span class="order">${actualOrder}回目</span> <span class="num">${num}</span> ${isGiven ? '<span class="prize-icon">🎁</span>' : ''}`;
        
        li.addEventListener('click', () => togglePrizeGiven(num));
        elHistoryList.appendChild(li);
    });
}

window.togglePrizeGiven = function(num) {
    if (!state.prizesGiven) state.prizesGiven = [];
    if (state.prizesGiven.includes(num)) {
        state.prizesGiven = state.prizesGiven.filter(n => n !== num);
    } else {
        state.prizesGiven.push(num);
    }
    saveState();
}

function updateRemainingCount() {
    const remaining = getAvailableNumbers().length;
    elStatRemaining.textContent = remaining;
    
    if (remaining === 0) {
        elBtnStart.disabled = true;
    } else {
        elBtnStart.disabled = false;
    }
}

function getAvailableNumbers() {
    const pool = [];
    for (let i = 1; i <= state.totalParticipants; i++) {
        if (!state.excludedNumbers.includes(i) && !state.drawnHistory.includes(i)) {
            pool.push(i);
        }
    }
    return pool;
}

// Actions
function updateParticipants() {
    const val = parseInt(elTotalParticipants.value, 10);
    if (val > 0) {
        state.totalParticipants = val;
        saveState();
    }
}

function addExclude() {
    // 参加人数の入力値が更新されていれば自動で反映する（更新ボタン押し忘れ対策）
    const totalVal = parseInt(elTotalParticipants.value, 10);
    if (totalVal > 0) {
        state.totalParticipants = totalVal;
    }

    const inputVal = elExcludeNumber.value.trim();
    if (!inputVal) return;

    // 全角カンマやハイフンを半角に変換しつつ分割
    const normalizedInput = inputVal.replace(/，/g, ',').replace(/ー|−/g, '-');
    const parts = normalizedInput.split(',').map(s => s.trim());
    const newExcludes = [];
    let hasError = false;

    for (const part of parts) {
        if (!part) continue;
        if (part.includes('-')) {
            const [startStr, endStr] = part.split('-');
            const start = parseInt(startStr, 10);
            const end = parseInt(endStr, 10);
            if (!isNaN(start) && !isNaN(end) && start <= end) {
                for (let i = start; i <= end; i++) {
                    newExcludes.push(i);
                }
            } else {
                hasError = true;
            }
        } else {
            const num = parseInt(part, 10);
            if (!isNaN(num)) {
                newExcludes.push(num);
            } else {
                hasError = true;
            }
        }
    }

    if (hasError || newExcludes.length === 0) {
        alert('入力形式が正しくありません。「1, 2, 5-10」のように入力してください。');
        return;
    }

    let addedCount = 0;
    for (const val of newExcludes) {
        if (val > 0 && val <= state.totalParticipants) {
            if (!state.excludedNumbers.includes(val) && !state.drawnHistory.includes(val)) {
                state.excludedNumbers.push(val);
                addedCount++;
            }
        }
    }

    if (addedCount === 0) {
        alert('追加できる有効な番号がありませんでした（すでに除外・当選済み、または範囲外）。');
        return;
    }

    state.excludedNumbers = [...new Set(state.excludedNumbers)]; // 重複排除
    state.excludedNumbers.sort((a, b) => a - b);
    elExcludeNumber.value = '';
    saveState();
}

window.removeExclude = function(num) {
    state.excludedNumbers = state.excludedNumbers.filter(n => n !== num);
    saveState();
};

function resetAll() {
    if (confirm('すべての履歴と設定をリセットしますか？')) {
        state = {
            totalParticipants: 100,
            excludedNumbers: [],
            drawnHistory: [],
            prizesGiven: [],
            appTitle: state.appTitle, // タイトルは保持する方が親切
            themeColor: state.themeColor // テーマカラーも保持
        };
        saveState();
        elWinnerDisplay.classList.add('hidden');
    }
}

function exportData() {
    const now = new Date();
    const dateStr = now.toLocaleString('ja-JP');
    
    let content = `Matsuri Lottery 証跡データ\n`;
    content += `取得日時: ${dateStr}\n\n`;
    
    content += `【設定】\n`;
    content += `タイトル: ${state.appTitle.trim() || 'なし'}\n`;
    content += `参加人数: ${state.totalParticipants}人\n`;
    content += `除外番号: ${state.excludedNumbers.length > 0 ? state.excludedNumbers.join(', ') : 'なし'}\n\n`;
    
    content += `【抽選結果】\n`;
    if (state.drawnHistory.length === 0) {
        content += `まだ抽選されていません。\n`;
    } else {
        state.drawnHistory.forEach((num, index) => {
            const isGiven = state.prizesGiven && state.prizesGiven.includes(num);
            const status = isGiven ? '🎁 引換済' : '未引換';
            content += `${index + 1}回目: ${num} (${status})\n`;
        });
    }
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    
    a.href = url;
    a.download = `lottery_export_${yyyy}${mm}${dd}_${hh}${min}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Animation Logic
function startLottery() {
    const pool = getAvailableNumbers();
    if (pool.length === 0) return;

    // ゲーム中は設定パネルを最小化する
    if (!elSettingsPanel.classList.contains('collapsed')) {
        toggleSettings();
    }

    elBtnStart.classList.add('hidden');
    elBtnStop.classList.remove('hidden');
    elWinnerDisplay.classList.add('hidden');
    
    arenaRect = elLotteryArena.getBoundingClientRect();
    
    // Clear previous elements
    document.querySelectorAll('.floating-number').forEach(el => el.remove());
    floatingElements = [];
    
    // Shuffle and pick a subset to animate
    const displayPool = [...pool].sort(() => 0.5 - Math.random()).slice(0, MAX_FLOATING_ELEMENTS);
    
    displayPool.forEach(num => {
        const el = document.createElement('div');
        el.className = 'floating-number';
        el.textContent = num;
        
        // Random initial position
        const x = Math.random() * (arenaRect.width - 60);
        const y = Math.random() * (arenaRect.height - 60);
        
        // Random velocity (fast for "暴れる")
        const speed = 5 + Math.random() * 10;
        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        
        el.style.transform = `translate(${x}px, ${y}px)`;
        
        elLotteryArena.appendChild(el);
        
        floatingElements.push({
            el,
            x, y, vx, vy,
            width: 60, height: 60
        });
    });
    
    animate();
}

function animate() {
    floatingElements.forEach(item => {
        item.x += item.vx;
        item.y += item.vy;
        
        // Bounce off walls
        if (item.x <= 0) {
            item.x = 0;
            item.vx *= -1;
        } else if (item.x + item.width >= arenaRect.width) {
            item.x = arenaRect.width - item.width;
            item.vx *= -1;
        }
        
        if (item.y <= 0) {
            item.y = 0;
            item.vy *= -1;
        } else if (item.y + item.height >= arenaRect.height) {
            item.y = arenaRect.height - item.height;
            item.vy *= -1;
        }
        
        item.el.style.transform = `translate(${item.x}px, ${item.y}px)`;
    });
    
    animationFrameId = requestAnimationFrame(animate);
}

function stopLottery() {
    const pool = getAvailableNumbers();
    if (pool.length === 0) return;
    
    elBtnStop.classList.add('hidden');
    elBtnStart.classList.remove('hidden');
    
    // Pick winner
    const winnerIndex = Math.floor(Math.random() * pool.length);
    const winner = pool[winnerIndex];
    
    // Stop animation loop
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    // Converge / fade out floating elements
    floatingElements.forEach(item => {
        item.el.classList.add('stopping');
        // Move towards center smoothly via CSS transform
        item.el.style.transform = `translate(${(arenaRect.width - item.width) / 2}px, ${(arenaRect.height - item.height) / 2}px) scale(0.1)`;
    });
    
    // Show winner after a short delay for drama
    setTimeout(() => {
        document.querySelectorAll('.floating-number').forEach(el => el.remove());
        floatingElements = [];
        
        elWinnerNumber.textContent = winner;
        elWinnerDisplay.classList.remove('hidden');
        
        // Create particles
        createParticles();
        
        // Save state
        state.drawnHistory.push(winner);
        saveState();
        
    }, 800);
}

function createParticles() {
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        elLotteryArena.appendChild(particle);
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = 50 + Math.random() * 150;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;
        
        particle.animate([
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`, opacity: 0 }
        ], {
            duration: 1000 + Math.random() * 500,
            easing: 'cubic-bezier(0, .9, .57, 1)'
        }).onfinish = () => particle.remove();
    }
}

// UI Controls
function toggleSettings() {
    elSettingsPanel.classList.toggle('collapsed');
    // アニメーション完了後に描画領域を更新
    setTimeout(() => {
        if (elLotteryArena) {
            arenaRect = elLotteryArena.getBoundingClientRect();
        }
    }, 300);
}

function toggleFullScreen() {
    const doc = document.documentElement;
    const isFullScreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

    if (!isFullScreen) {
        if (doc.requestFullscreen) {
            doc.requestFullscreen().catch(err => console.error(err));
        } else if (doc.webkitRequestFullscreen) { /* Safari */
            doc.webkitRequestFullscreen();
        } else if (doc.msRequestFullscreen) { /* IE11 */
            doc.msRequestFullscreen();
        } else if (doc.mozRequestFullScreen) { /* Firefox */
            doc.mozRequestFullScreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        }
    }
}

// Event Listeners
function setupEventListeners() {
    elBtnUpdateParticipants.addEventListener('click', updateParticipants);
    elBtnAddExclude.addEventListener('click', addExclude);
    elBtnReset.addEventListener('click', resetAll);
    if (elBtnExport) elBtnExport.addEventListener('click', exportData);
    if (elBtnFullscreen) elBtnFullscreen.addEventListener('click', toggleFullScreen);
    elBtnStart.addEventListener('click', startLottery);
    elBtnStop.addEventListener('click', stopLottery);
    elBtnToggleSettings.addEventListener('click', toggleSettings);
    if (elBtnCloseSettings) {
        elBtnCloseSettings.addEventListener('click', toggleSettings);
    }
    
    if (elAppTitleInput) {
        elAppTitleInput.addEventListener('input', (e) => {
            elAppTitleDisplay.textContent = e.target.value;
        });
        elAppTitleInput.addEventListener('change', (e) => {
            state.appTitle = e.target.value;
            saveState();
        });
    }

    if (elThemeColorInput) {
        elThemeColorInput.addEventListener('input', (e) => {
            applyThemeColor(e.target.value);
        });
        elThemeColorInput.addEventListener('change', (e) => {
            state.themeColor = e.target.value;
            saveState();
        });
    }
    
    if (elSearchHistory) {
        elSearchHistory.addEventListener('input', (e) => {
            renderHistoryList(e.target.value);
        });
    }

    elExcludeNumber.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addExclude();
    });
    elTotalParticipants.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') updateParticipants();
    });
}

// Run
init();
