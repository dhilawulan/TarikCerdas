let gameWon = false;
let winningTeam = null;

// =========================================================
// 1. SISTEM AUDIO (QUIZ BACKSOUND & WINNER SOUND)
// =========================================================
const quizSound = new Audio('/sounds/quiz-theme.mp3');     // Path audio kuis
const winnerSound = new Audio('/sounds/winner-fanfare.mp3'); // Path audio pemenang

quizSound.loop = true;  // Audio kuis berulang (loop) selama kuis berjalan
quizSound.volume = 0.5;

winnerSound.loop = false; // Audio pemenang HANYA diputar 1 kali
winnerSound.volume = 0.8;

let isQuizSoundPlaying = false;
let isQuizStarted = false; // Flag untuk mencatat apakah kuis sudah resmi dimulai via jawaban
let isAudioUnlocked = false; // Penanda apakah browser sudah mengizinkan autoplay

// Pancing/Unlock izin audio browser saat ada interaksi pertama dari user
function unlockAudioContext() {
    if (isAudioUnlocked) return;
    
    // Putar audio bisu singkat atau pancing play-pause untuk membuka proteksi autoplay browser
    const unlockPromise = quizSound.play();
    if (unlockPromise !== undefined) {
        unlockPromise.then(() => {
            if (!isQuizStarted) {
                quizSound.pause();
                quizSound.currentTime = 0;
            } else {
                isQuizSoundPlaying = true;
            }
            isAudioUnlocked = true;
        }).catch(() => {
            // Pengguna belum melakukan interaksi penuh
        });
    }
}

// Fungsi Memulai Audio Kuis
function startQuizAudio() {
    if (!isQuizSoundPlaying && !gameWon) {
        quizSound.play().then(() => {
            isQuizSoundPlaying = true;
            isQuizStarted = true;
            isAudioUnlocked = true;
        }).catch(err => {
            console.warn("Menunggu interaksi pengguna untuk memutar audio kuis:", err);
        });
    }
}

// Fungsi Menghentikan Audio Kuis
function stopQuizSound() {
    quizSound.pause();
    quizSound.currentTime = 0;
    isQuizSoundPlaying = false;
}

// Fungsi Memutar Audio Pemenang (1x Saja)
function triggerWinnerSound() {
    stopQuizSound(); // Matikan audio kuis terlebih dahulu

    winnerSound.currentTime = 0; // Reset audio pemenang ke awal
    const playPromise = winnerSound.play();

    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log("Audio pemenang berhasil diputar!");
        }).catch(err => {
            console.error("Gagal memutar audio pemenang karena Autoplay Policy:", err);
            
            // Pengaman Cadangan: Jika diblokir, pasang event listener satu kali saat pengguna mengeklik layar
            const playOnUserInteraction = () => {
                winnerSound.play().catch(e => console.error(e));
                document.removeEventListener('click', playOnUserInteraction);
            };
            document.addEventListener('click', playOnUserInteraction);
        });
    }
}

// Pengecekan Status Game Otomatis
async function checkGameStatus() {
    try {
        const level = window.gameLevel || 'low';
        const res = await fetch(`/api/game-status?level=${level}`);
        const data = await res.json();
        
        // Cek jika kedua tim telah selesai menjawab
        if (data.bothFinished && !gameWon) {
            gameWon = true;

            const score1 = data.skor ? (data.skor[1] || 0) : 0;
            const score2 = data.skor ? (data.skor[2] || 0) : 0;

            const t1 = data.timeSpent && data.timeSpent[1] ? data.timeSpent[1] : null;
            const t2 = data.timeSpent && data.timeSpent[2] ? data.timeSpent[2] : null;

            // Penentuan Pemenang
            if (score1 > score2) {
                winningTeam = 1;
            } else if (score2 > score1) {
                winningTeam = 2;
            } else {
                if (t1 != null && t2 != null) {
                    winningTeam = (t1 <= t2) ? 1 : 2;
                } else if (t1 != null) {
                    winningTeam = 1;
                } else if (t2 != null) {
                    winningTeam = 2;
                } else {
                    winningTeam = 0; // Seri
                }
            }

            function formatMs(ms) {
                if (ms == null) return '00:00';
                const totalSec = Math.floor(ms / 1000);
                const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
                const s = (totalSec % 60).toString().padStart(2, '0');
                return `${m}:${s}`;
            }

            const timeStr1 = formatMs(t1);
            const timeStr2 = formatMs(t2);

            showWinScreen(score1, score2, winningTeam, timeStr1, timeStr2);
        }
    } catch (error) {
        console.error('Error checking game status:', error);
    }
}

// Update Pergeseran Tali & Skor
async function updateBar() {
    try {
        let res = await fetch('/api/score');
        let data = await res.json();

        const score1 = data[1] || 0;
        const score2 = data[2] || 0;

        if (document.getElementById('scoreTeam1')) {
            document.getElementById('scoreTeam1').textContent = score1;
        }
        if (document.getElementById('scoreTeam2')) {
            document.getElementById('scoreTeam2').textContent = score2;
        }

        let total = score1 + score2;
        if ((total > 0 || (data.activity && data.activity === true)) && !isQuizSoundPlaying && !gameWon) {
            startQuizAudio();
        }

        if (total === 0) return;

        let selisih = score2 - score1;
        let posisi = selisih * 20;

        if (posisi > 150) posisi = 150;
        if (posisi < -150) posisi = -150;

        const ropeImg = document.getElementById("rope-img");
        if (ropeImg) {
            ropeImg.style.transform = `translateX(${posisi}px)`;
        }
    } catch (e) {
        console.error("Error updating score bar:", e);
    }
}

// Tampilkan Layar Kemenangan Presisi Sesuai Desain Foto
function showWinScreen(scoreTeam1, scoreTeam2, winner, time1, time2) {
    localStorage.setItem('gameCurrentView', 'winScreen');

    // Hapus/sembunyikan elemen kuis & tombol Refresh khusus layar pemenang
    const elementsToHide = [
        '#qrModeContainer',
        '.qr-codes-container',
        '.rope-area',
        '.scores-display',
        '.class-game-header',
        '#mainScreenMode',
        '.mode-switch',
        '#winRefreshBtn',
        '.btn-win-refresh'
    ];

    elementsToHide.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.style.setProperty('display', 'none', 'important');
        });
    });

    const gameContainer = document.getElementById('gameContainer');
    const quizSection = document.getElementById('quizSection');
    const summarySection = document.getElementById('summarySection');
    const winScreen = document.getElementById('winScreen');
    
    const winTitle = document.getElementById('winTitle');
    const winLevelSubtitle = document.getElementById('winLevelSubtitle');
    const winMessage = document.querySelector('.win-message');
    const winScoreTeam1Top = document.getElementById('winScoreTeam1Top');
    const winScoreTeam2Top = document.getElementById('winScoreTeam2Top');

    if (summarySection) summarySection.style.display = 'none';
    if (gameContainer) gameContainer.style.display = 'none';
    if (quizSection) quizSection.style.display = 'block';

    const currentLevel = window.gameLevel || 'low';
    const isKategoriTambahan = (currentLevel === 'tambahan' || currentLevel === 'extra');

    if (winLevelSubtitle) {
        if (isKategoriTambahan) {
            winLevelSubtitle.textContent = 'Kategori Tambahan';
        } else {
            winLevelSubtitle.textContent = currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1) + ' Level';
        }
    }

    if (winMessage) {
        if (isKategoriTambahan) {
            winMessage.textContent = 'Luar biasa! Babak tantangan tambahan berhasil diselesaikan dengan baik!';
        } else {
            winMessage.textContent = 'Selamat! Kekompakan tim kalian berhasil menaklukkan tantangan ini!';
        }
    }

    if (winTitle && winScreen) {
        winScreen.classList.remove('win-theme-tambahan');

        if (winner === 0) {
            winTitle.textContent = `PERMAINAN SERI`;
            winTitle.style.color = '#ffd700'; 
            winTitle.style.textShadow = '0 0 30px rgba(255, 215, 0, 0.8)';
        } else {
            winTitle.textContent = `TIM ${winner} MENANG`;
            if (winner === 1) {
                winTitle.style.color = '#00f2ff';
                winTitle.style.textShadow = '0 0 30px rgba(0, 242, 255, 0.8)';
            } else {
                winTitle.style.color = '#ff2a8d';
                winTitle.style.textShadow = '0 0 30px rgba(255, 42, 141, 0.8)';
            }
        }

        if (isKategoriTambahan) {
            winScreen.classList.add('win-theme-tambahan');
        }
    }

    if (winScoreTeam1Top) winScoreTeam1Top.textContent = scoreTeam1;
    if (winScoreTeam2Top) winScoreTeam2Top.textContent = scoreTeam2;
    
    if (winScreen) {
        winScreen.style.setProperty('display', 'flex', 'important');
    }
    
    if (typeof createConfetti === 'function') createConfetti();
    triggerWinnerSound();
}

// Reset Game Handlers
async function handleResetGame() {
    if (confirm('Apakah Anda yakin ingin mereset skor dan memulai dari awal?')) {
        try {
            const level = window.gameLevel || 'low';
            
            const response = await fetch('/api/reset-score', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ level: level })
            });
            
            if (response.ok) {
                stopQuizSound();
                winnerSound.pause();
                winnerSound.currentTime = 0;
                isQuizStarted = false;

                localStorage.setItem('gameDisplayMode', 'qr');
                localStorage.removeItem('gameCurrentView');
                localStorage.setItem('activeSection', 'quiz');

                gameWon = false;
                winningTeam = null;

                window.location.reload();
            }
        } catch (error) {
            console.error('Error resetting score:', error);
            alert('Gagal mereset skor');
        }
    }
}

// FUNGSI OTOMATIS RESET SCORE & NAVIGASI KE DASHBOARD
async function handleBackToDashboard(e) {
    if (e) e.preventDefault();
    try {
        const level = window.gameLevel || 'low';
        
        await fetch('/api/reset-score', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ level: level })
        });
    } catch (err) {
        console.error('Error auto resetting score before dashboard navigation:', err);
    } finally {
        stopQuizSound();
        if (winnerSound) {
            winnerSound.pause();
            winnerSound.currentTime = 0;
        }

        localStorage.removeItem('activeSection');
        localStorage.removeItem('gameCurrentView');
        localStorage.setItem('gameDisplayMode', 'qr');

        gameWon = false;
        winningTeam = null;

        window.location.href = '/dashboard';
    }
}

// Event Listeners Initialization
document.addEventListener('DOMContentLoaded', function() {
    // Pancing unlock audio pada klik pertama di manapun dalam dokumen
    document.addEventListener('click', unlockAudioContext, { once: true });

    const userRole = localStorage.getItem('userRole') || 'guru';
    
    function hideGuruElements() {
        if (userRole === 'siswa') {
            const selectorsToHide = [
                '.guru-only-btn',
                '.btn-manage',
                '.edit-materi-btn',
                '.btn-edit-materi',
                '.btn-save-materi',
                '#saveMateriBtn',
                '.btn-edit',
                '.edit-timer-btn',
                '.btn-edit-timer',
                '#editTimerBtn',
                '[onclick*="enableEditMateri"]',
                '[onclick*="toggleEdit"]'
            ];

            selectorsToHide.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    el.style.setProperty('display', 'none', 'important');
                });
            });
        }
    }

    hideGuruElements();

    const observer = new MutationObserver(() => {
        hideGuruElements();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.querySelectorAll('a[href="/dashboard"], .btn-win-back, .btn-back-game').forEach(link => {
        if (link.getAttribute('href') === '/dashboard' || link.classList.contains('btn-win-back')) {
            link.addEventListener('click', handleBackToDashboard);
        }
    });

    document.addEventListener('click', function handleFirstAnswerClick(e) {
        const isOptionButton = e.target.closest('.opsi-btn') || 
                               e.target.closest('.main-opsi-btn') || 
                               e.target.classList.contains('opsi-btn');
        if (isOptionButton && !isQuizStarted && !gameWon) {
            startQuizAudio();
        }
    });

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', handleResetGame);

    const winRefreshBtn = document.getElementById('winRefreshBtn');
    if (winRefreshBtn) winRefreshBtn.addEventListener('click', handleResetGame);

    const modeQrBtn = document.getElementById('modeQrBtn');
    const modeScreenBtn = document.getElementById('modeScreenBtn');

    function setDisplayMode(mode) {
        const qrContainer = document.getElementById('qrModeContainer');
        const mainScreen = document.getElementById('mainScreenMode');
        const gameHeader = document.querySelector('.class-game-header');
        const topRope = document.querySelector('.rope-area');

        localStorage.setItem('gameDisplayMode', mode);

        if (mode === 'screen') {
            if (qrContainer) qrContainer.style.display = 'none';
            if (mainScreen) mainScreen.style.display = 'flex';
            if (gameHeader) gameHeader.style.display = 'none';
            if (topRope) topRope.style.display = 'none';
            if (modeQrBtn) modeQrBtn.classList.remove('active');
            if (modeScreenBtn) modeScreenBtn.classList.add('active');
        } else {
            if (qrContainer) qrContainer.style.display = 'flex';
            if (mainScreen) mainScreen.style.display = 'none';
            if (gameHeader) gameHeader.style.display = 'block';
            if (topRope) topRope.style.display = 'flex';
            if (modeQrBtn) modeQrBtn.classList.add('active');
            if (modeScreenBtn) modeScreenBtn.classList.remove('active');
        }
    }

    if (modeQrBtn && modeScreenBtn) {
        modeQrBtn.addEventListener('click', function() { setDisplayMode('qr'); });
        modeScreenBtn.addEventListener('click', function() {
            setDisplayMode('screen');
            if (typeof initMainScreenMode === 'function' && window.mainScreenQuestionsTeam1 && window.mainScreenQuestionsTeam1.length === 0) {
                initMainScreenMode();
            }
        });
        
        const savedMode = localStorage.getItem('gameDisplayMode') || 'qr';
        const currentView = localStorage.getItem('gameCurrentView');

        if (currentView === 'winScreen') {
            localStorage.removeItem('gameCurrentView');
            localStorage.setItem('gameDisplayMode', 'qr');
            setDisplayMode('qr');
        } else {
            setDisplayMode(savedMode);
        }
    }
});

setInterval(updateBar, 1000);
setInterval(checkGameStatus, 500);