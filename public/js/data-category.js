// Variable Global untuk Kategori agar bisa diakses oleh Win Screen
window.currentCategoryName = 'Web';

document.addEventListener('DOMContentLoaded', () => {
    const categoryMaterialsContainer = document.getElementById('categoryMaterials');
    if (!categoryMaterialsContainer) return;

    const categoryName = categoryMaterialsContainer.getAttribute('data-category') || 'web';
    window.currentCategoryName = categoryName;

    // Variables Timer Game
    let totalTime = 60; // Durasi waktu game dalam detik
    let timeRemaining = totalTime;
    let timerInterval = null;

    // Helper Sinkronisasi Tema Global
    function syncTheme() {
        if (typeof window.applyGlobalTheme === 'function') {
            window.applyGlobalTheme();
        } else {
            const savedTheme = localStorage.getItem('theme') || 'dark';
            if (savedTheme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
                if (document.body) document.body.setAttribute('data-theme', 'light');
            } else {
                document.documentElement.removeAttribute('data-theme');
                if (document.body) document.body.removeAttribute('data-theme');
            }
        }
    }

    // Helper pencarian elemen arena game secara aman
    function getGameArena() {
        return document.getElementById('gameArena') || 
               document.querySelector('.class-game-wrapper') || 
               document.querySelector('.class-game-container');
    }

    // 1. Load data materi dari server API
    async function loadMaterial() {
        try {
            const response = await fetch(`/api/materi/${encodeURIComponent(categoryName)}`);
            if (!response.ok) throw new Error("Gagal mengambil materi");
            const data = await response.json();
            const canEdit = Boolean(data.canEdit) &&
                localStorage.getItem('userRole') !== 'siswa';
            renderMaterialCard(
                data.judul || categoryName, 
                data.isi || '',
                canEdit
            );
        } catch (err) {
            console.error('Gagal memuat materi:', err);
            renderMaterialCard(categoryName, '', false);
        }
    }

    // 2. Render kartu materi
    function renderMaterialCard(titleText, bodyText, canEdit) {
        const gameArena = getGameArena();
        if (gameArena) {
            gameArena.style.display = 'none';
        }

        categoryMaterialsContainer.style.display = 'flex';
        categoryMaterialsContainer.style.visibility = 'visible';
        categoryMaterialsContainer.style.opacity = '1';

        categoryMaterialsContainer.innerHTML = `
            <div class="info-card">
                ${canEdit ? `<button class="edit-btn" id="editMaterialBtn" title="Edit Konten">
                    <i class="fas fa-pen"></i>
                </button>` : ''}
                <div class="card-title" id="materialTitle" contenteditable="${canEdit}" spellcheck="false">${titleText}</div>
                <div class="card-body" id="materialBody" contenteditable="${canEdit}" spellcheck="false">${bodyText}</div>
            </div>

            <button class="btn-lanjut" id="startQuizBtn">Lanjut ke kuis -&gt;</button>
        `;

        syncTheme();

        const titleElem = document.getElementById('materialTitle');
        const bodyElem = document.getElementById('materialBody');
        const editBtn = document.getElementById('editMaterialBtn');
        const startBtn = document.getElementById('startQuizBtn');

        if (editBtn && bodyElem) editBtn.addEventListener('click', () => bodyElem.focus());

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                startQuizMode();
            });
        }

        // Auto Save ke Server
        let saveTimeout;
        const autoSave = () => {
            if (!canEdit) return;
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`/api/materi/${encodeURIComponent(categoryName)}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            judul: titleElem ? titleElem.innerText : categoryName,
                            isi: bodyElem ? bodyElem.innerText : ''
                        })
                    });
                    if (!response.ok) throw new Error('Server menolak penyimpanan materi.');
                } catch (err) {
                    console.error('Gagal menyimpan materi:', err);
                }
            }, 600);
        };

        if (titleElem) titleElem.addEventListener('input', autoSave);
        if (bodyElem) bodyElem.addEventListener('input', autoSave);
    }

    // 3. Memulai Mode Kuis & Timer
    function startQuizMode() {
        categoryMaterialsContainer.style.display = 'none';

        const gameArena = getGameArena();
        if (gameArena) {
            gameArena.style.display = 'flex';
        }

        injectTimerElement();
        startTimer();

        if (typeof window.startQuiz === 'function') {
            window.startQuiz();
        }
    }

    // 4. Injeksi Elemen Timer
    function injectTimerElement() {
        if (document.getElementById('gameTimerContainer')) return;

        const headerTarget = document.querySelector('.class-game-header') || document.querySelector('.scores-display');
        if (headerTarget) {
            const timerWrapper = document.createElement('div');
            timerWrapper.id = 'gameTimerContainer';
            timerWrapper.className = 'timer-container';
            timerWrapper.innerHTML = `
                <i class="bi bi-clock-fill"></i>
                <span id="gameTimer">01:00</span>
            `;
            headerTarget.parentNode.insertBefore(timerWrapper, headerTarget);
        }
    }

    // 5. Logika Timer
    function startTimer() {
        timeRemaining = totalTime;
        updateTimerDisplay();

        if (timerInterval) clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();

            const timerContainer = document.getElementById('gameTimerContainer');
            if (timeRemaining <= 10 && timerContainer) {
                timerContainer.classList.add('warning');
            }

            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                if (typeof window.showWinScreen === 'function') {
                    window.showWinScreen(12, 10, 1);
                }
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const timerElem = document.getElementById('gameTimer');
        if (!timerElem) return;

        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timerElem.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    window.stopCategoryTimer = function() {
        if (timerInterval) clearInterval(timerInterval);
    };

    syncTheme();
    loadMaterial();
});

// =========================================================
// 6. FUNGSI WIN SCREEN PRESISI BERSINAR & OVERRIDE GAME.JS
// =========================================================
window.showWinScreen = function(param1, param2, param3) {
    if (typeof window.stopCategoryTimer === 'function') {
        window.stopCategoryTimer();
    }

    // 1. Ekstraksi Fleksibel Parameter dari Game.js maupun Data-Category.js
    let score1 = 0;
    let score2 = 0;
    let winnerTeam = 1;

    if (typeof param1 === 'string') {
        winnerTeam = param1.toLowerCase().includes('2') ? 2 : (param1.toLowerCase().includes('1') ? 1 : 0);
        score1 = param2 || 0;
        score2 = param3 || 0;
    } else {
        score1 = param1 || 0;
        score2 = param2 || 0;
        winnerTeam = param3 !== undefined ? param3 : 1;
    }

    // 2. SEMBUNYIKAN PAKSA SEMUA KONTAINER QR CODE & ARENA KUIS
    const elementsToHide = [
        '#qrModeContainer',
        '.qr-codes-container',
        '.team-qr',
        '.rope-area',
        '.scores-display',
        '.class-game-header',
        '#mainScreenMode',
        '.mode-switch',
        '#categoryMaterials',
        '.intro-summary-wrapper',
        '#gameTimerContainer',
        '#gameContainer',
        '#quizSection'
    ];

    elementsToHide.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            el.style.setProperty('opacity', '0', 'important');
        });
    });

    // Sembunyikan semua gambar QR Code
    document.querySelectorAll('img[src*="qr"], .qr-code-box, canvas').forEach(el => {
        el.style.setProperty('display', 'none', 'important');
    });

    // 3. Ambil / Buat Elemen Kontainer Utama #winScreen
    let winScreen = document.getElementById('winScreen');
    if (!winScreen) {
        winScreen = document.createElement('div');
        winScreen.id = 'winScreen';
        document.body.appendChild(winScreen);
    }

    // Paksa styling Win Screen agar menutupi seluruh layar di atas semua elemen
    winScreen.className = 'win-screen-integrated';
    winScreen.style.setProperty('position', 'fixed', 'important');
    winScreen.style.setProperty('top', '0', 'important');
    winScreen.style.setProperty('left', '0', 'important');
    winScreen.style.setProperty('width', '100vw', 'important');
    winScreen.style.setProperty('height', '100vh', 'important');
    winScreen.style.setProperty('z-index', '999999', 'important');
    winScreen.style.setProperty('display', 'flex', 'important');
    winScreen.style.setProperty('flex-direction', 'column', 'important');
    winScreen.style.setProperty('justify-content', 'space-between', 'important');
    winScreen.style.setProperty('align-items', 'center', 'important');

    const currentCat = window.currentCategoryName || 'Web';
    let titleText = winnerTeam === 0 ? 'PERMAINAN SERI' : `TIM ${winnerTeam} MENANG`;
    let titleColor = winnerTeam === 2 ? '#ff2a8d' : (winnerTeam === 1 ? '#00f2ff' : '#ffd700');

    // 4. Inject Tampilan Menang Persis Seperti Gambar Referensi (/low)
    winScreen.innerHTML = `
        <div id="confetti" class="confetti-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;"></div>

        <div class="win-header" style="text-align: center; margin-top: 15px; z-index: 10;">
            <h1 id="winTitle" style="color: ${titleColor}; text-shadow: 0 0 25px ${titleColor}; font-size: clamp(2rem, 5vw, 3.2rem); font-weight: 900; margin-bottom: 2px; text-transform: uppercase;">${titleText}</h1>
            <p class="win-level-subtitle" style="font-size: 1.1rem; font-weight: 600; margin-bottom: 4px;">${currentCat.charAt(0).toUpperCase() + currentCat.slice(1)} Level</p>
            <p class="win-message" style="font-size: 0.95rem; opacity: 0.9;">Selamat! Kekompakan tim kalian berhasil menaklukkan tantangan ini!</p>
            
            <div class="win-scores-row" style="margin-top: 15px; display: flex; justify-content: center; gap: 30px;">
                <div class="score-box team-1-score" style="font-size: 2rem; font-weight: 800; color: #00f2ff; text-shadow: 0 0 15px rgba(0, 242, 255, 0.6);">SKOR: ${score1}</div>
                <div class="score-box team-2-score" style="font-size: 2rem; font-weight: 800; color: #ff2a8d; text-shadow: 0 0 15px rgba(255, 42, 141, 0.6);">SKOR: ${score2}</div>
            </div>
        </div>

        <div class="win-stage-container" style="position: relative; width: 100%; max-width: 750px; height: 320px; display: flex; justify-content: center; align-items: flex-end; margin: 10px 0; z-index: 5;">
            <!-- Gambar Karakter Tali Tambang Presisi -->
            <img src="/images/rope.png" class="rope-img-win" alt="Rope Game" onerror="this.style.display='none'" style="position: absolute; bottom: 85px; left: 50%; transform: translateX(-50%); width: 90%; max-width: 650px; height: auto; z-index: 4; filter: drop-shadow(0 8px 15px rgba(0,0,0,0.5));" />

            <div class="center-beam" style="position: absolute; bottom: 45px; width: 38px; height: 200px; background: linear-gradient(to top, rgba(255, 42, 141, 0.85), rgba(0, 242, 255, 0.85)); box-shadow: 0 0 35px #00f2ff, 0 0 60px #ff2a8d; z-index: 3; display: flex; justify-content: center; align-items: flex-start;">
                <div class="crystal-top" style="font-size: 22px; margin-top: -15px;">💎</div>
            </div>
            <div class="main-trophy" style="position: absolute; bottom: 5px; z-index: 10; text-align: center; font-size: 65px; filter: drop-shadow(0 0 20px #ffd700);">🏆</div>
            <div class="stone-pedestal" style="width: 680px; height: 90px; background: linear-gradient(180deg, #373c52 0%, #171826 100%); border-radius: 8px 8px 0 0; position: relative; border: 2px solid #4a5173;">
                <div class="pedestal-front" style="position: absolute; top: 18px; left: 10%; width: 80%; height: 50px; border: 1px solid #3c4361; display: flex; flex-direction: column; justify-content: space-around; padding: 4px;">
                    <div class="neon-line-cyan" style="width: 100%; height: 2px; background: #00f2ff; box-shadow: 0 0 8px #00f2ff;"></div>
                    <div class="neon-line-pink" style="width: 100%; height: 2px; background: #ff2a8d; box-shadow: 0 0 8px #ff2a8d;"></div>
                </div>
            </div>
        </div>

        <div class="win-buttons-row" style="display: flex; gap: 15px; z-index: 10; margin-bottom: 25px;">
            <a href="/dashboard" class="btn-neon btn-cyan" style="background: #0284c7; color: white; padding: 12px 35px; border-radius: 50px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 20px rgba(2, 132, 199, 0.5); font-size: 1rem;">
                <i class="bi bi-house-door-fill"></i> Kembali ke Dashboard
            </a>
        </div>
    `;

    // 5. Efek Confetti Bintang Berkilau
    const confettiBox = document.getElementById('confetti');
    if (confettiBox) {
        confettiBox.innerHTML = '';
        for (let i = 0; i < 50; i++) {
            const star = document.createElement('div');
            star.innerHTML = '✨';
            star.style.position = 'absolute';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 80 + '%';
            star.style.fontSize = (Math.random() * 20 + 15) + 'px';
            star.style.opacity = Math.random() * 0.8 + 0.3;
            confettiBox.appendChild(star);
        }
    }

    if (typeof window.applyGlobalTheme === 'function') {
        window.applyGlobalTheme();
    }
};