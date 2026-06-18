let gameWon = false;
let winningTeam = null;

async function checkGameStatus() {
    try {
        const res = await fetch('/api/game-status');
        const data = await res.json();
        
        // Check if both teams finished
        if (data.bothFinished && !gameWon) {
            gameWon = true;

            const score1 = data.skor[1] || 0;
            const score2 = data.skor[2] || 0;

            // timeSpent returned by server is in milliseconds or null
            const t1 = data.timeSpent && data.timeSpent[1] ? data.timeSpent[1] : null;
            const t2 = data.timeSpent && data.timeSpent[2] ? data.timeSpent[2] : null;

            // Determine winning team by score first, then by fastest time if tie
            if (score1 > score2) {
                winningTeam = 1;
            } else if (score2 > score1) {
                winningTeam = 2;
            } else {
                // tie on score -> compare times (smaller ms wins). If any time is null, treat that team as slower.
                if (t1 != null && t2 != null) {
                    winningTeam = (t1 <= t2) ? 1 : 2;
                } else if (t1 != null) {
                    winningTeam = 1;
                } else if (t2 != null) {
                    winningTeam = 2;
                } else {
                    winningTeam = 0; // fully tie/no times
                }
            }

            // Format times to mm:ss
            function formatMs(ms) {
                if (ms == null) return '00:00';
                const totalSec = Math.floor(ms / 1000);
                const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
                const s = (totalSec % 60).toString().padStart(2, '0');
                return `${m}:${s}`;
            }

            const timeStr1 = formatMs(t1);
            const timeStr2 = formatMs(t2);

            // Show win screen with times
            showWinScreen(score1, score2, winningTeam, timeStr1, timeStr2);
        }
    } catch (error) {
        console.error('Error checking game status:', error);
    }
}

async function updateBar() {
    let res = await fetch('/api/score');
    let data = await res.json();

    // Update score display
    if (document.getElementById('scoreTeam1')) {
        document.getElementById('scoreTeam1').textContent = data[1] || 0;
    }
    if (document.getElementById('scoreTeam2')) {
        document.getElementById('scoreTeam2').textContent = data[2] || 0;
    }

    let total = data[1] + data[2];
    if (total === 0) return;

    // hitung selisih skor
    let selisih = data[2] - data[1];

    // ubah jadi posisi (pixel)
    let posisi = selisih * 20; // angka 20 bisa kamu ubah (kecepatan geser)

    // batas biar gak keluar layar
    if (posisi > 150) posisi = 150;
    if (posisi < -150) posisi = -150;

    // geser gambar
    document.getElementById("rope-img").style.transform =
        `translateX(${posisi}px)`;
}

// Create confetti effect
function createConfetti() {
    const confettiContainer = document.getElementById('confetti');
    if (!confettiContainer) return;

    const colors = ['#ff4da6', '#ffd700', '#8a2be2', '#00ff88', '#ff6b6b'];
    const confettiCount = 100;

    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = Math.random() * 10 + 5 + 'px';
        confetti.style.height = confetti.style.width;
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        confetti.style.opacity = Math.random() * 0.8 + 0.2;
        
        const duration = Math.random() * 3 + 2;
        const delay = Math.random() * 0.5;
        confetti.style.animation = `fallStar ${duration}s linear ${delay}s forwards`;
        
        confettiContainer.appendChild(confetti);
    }

    // Add stars animation
    for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.innerHTML = '✨';
        star.style.position = 'absolute';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 50 + '%';
        star.style.fontSize = Math.random() * 20 + 15 + 'px';
        star.style.opacity = Math.random() * 0.8 + 0.3;
        
        const duration = Math.random() * 3 + 2;
        const delay = Math.random() * 0.5;
        star.style.animation = `fall ${duration}s ease-in ${delay}s forwards`;
        star.style.pointerEvents = 'none';
        
        confettiContainer.appendChild(star);
    }
}

// Show win screen
function showWinScreen(scoreTeam1, scoreTeam2, winner, time1, time2) {
    const gameContainer = document.getElementById('gameContainer');
    const winScreen = document.getElementById('winScreen');
    const winTitle = document.getElementById('winTitle');
    const winScoreTeam1Top = document.getElementById('winScoreTeam1Top');
    const winScoreTeam2Top = document.getElementById('winScoreTeam2Top');
    const trophyLabel = document.getElementById('trophyLabel');
    const trophyScore = document.getElementById('trophyScore');
    const winTimeTeam1 = document.getElementById('winTimeTeam1');
    const winTimeTeam2 = document.getElementById('winTimeTeam2');

    if (gameContainer && winScreen) {
        // Hide game container
        gameContainer.style.display = 'none';
        
        // Update win screen content
        if (winner === 0) {
            // Tie
            winTitle.textContent = `SERI`;
            winTitle.style.color = '#ffd700'; // Gold for tie
            trophyLabel.textContent = 'SERI';
            trophyScore.textContent = '👑';
        } else {
            winTitle.textContent = `TIM ${winner} MENANG`;
            if (winner === 1) {
                winTitle.style.color = '#00ff88'; // Green for team 1
                trophyLabel.textContent = 'SKOR TIM 1';
            } else {
                winTitle.style.color = '#ff6b6b'; // Red for team 2
                trophyLabel.textContent = 'SKOR TIM 2';
            }
        }
        
        winScoreTeam1Top.textContent = scoreTeam1;
        winScoreTeam2Top.textContent = scoreTeam2;
        trophyScore.textContent = (winner === 1 ? scoreTeam1 : winner === 2 ? scoreTeam2 : '—');
        if (winTimeTeam1) winTimeTeam1.textContent = time1 || '00:00';
        if (winTimeTeam2) winTimeTeam2.textContent = time2 || '00:00';
        
        // Highlight winning team score
        if (winner === 1) {
            winScoreTeam1Top.style.color = '#00ff88';
            winScoreTeam1Top.style.textShadow = '0 0 30px rgba(0, 255, 136, 1)';
            winScoreTeam2Top.style.color = '#999';
            winScoreTeam2Top.style.textShadow = 'none';
            trophyLabel.style.color = '#00ff88';
            trophyScore.style.color = '#00ff88';
        } else if (winner === 2) {
            winScoreTeam1Top.style.color = '#999';
            winScoreTeam1Top.style.textShadow = 'none';
            winScoreTeam2Top.style.color = '#ff6b6b';
            winScoreTeam2Top.style.textShadow = '0 0 30px rgba(255, 107, 107, 1)';
            trophyLabel.style.color = '#ff6b6b';
            trophyScore.style.color = '#ff6b6b';
        }
        
        // Show win screen
        winScreen.style.display = 'flex';
        
        // Create confetti
        createConfetti();
        
        // Play sound effect if available (optional)
        playWinSound();
        // mark winner QR with badge
        try {
            document.querySelectorAll('.win-qr-box .winner-badge').forEach(el => el.style.display = 'none');
            if (winner === 1) {
                const el = document.querySelectorAll('.win-team-qr')[0];
                if (el) el.querySelector('.winner-badge').style.display = 'block';
            } else if (winner === 2) {
                const el = document.querySelectorAll('.win-team-qr')[1];
                if (el) el.querySelector('.winner-badge').style.display = 'block';
            }
        } catch (e) {}
    }
}

// Play win sound (optional)
function playWinSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Play a celebratory tone
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.log('Sound effect not available');
    }
}

// Setup refresh button
document.addEventListener('DOMContentLoaded', function() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            if (confirm('Apakah Anda yakin ingin mereset skor dan memulai dari awal?')) {
                try {
                    const response = await fetch('/api/reset-score', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'}
                    });
                    
                    if (response.ok) {
                        // Reset UI
                        if (document.getElementById('scoreTeam1')) {
                            document.getElementById('scoreTeam1').textContent = '0';
                        }
                        if (document.getElementById('scoreTeam2')) {
                            document.getElementById('scoreTeam2').textContent = '0';
                        }
                        if (document.getElementById('rope-img')) {
                            document.getElementById('rope-img').style.transform = 'translateX(0px)';
                        }
                        
                        // Hide win screen and show game container
                        const gameContainer = document.getElementById('gameContainer');
                        const winScreen = document.getElementById('winScreen');
                        if (winScreen) {
                            winScreen.style.display = 'none';
                            if (gameContainer) {
                                gameContainer.style.display = 'flex';
                            }
                            // Clear confetti
                            const confettiContainer = document.getElementById('confetti');
                            if (confettiContainer) {
                                confettiContainer.innerHTML = '';
                            }
                        }
                        
                        // Reset game state
                        gameWon = false;
                        winningTeam = null;
                        
                        alert('Skor telah direset!');
                    }
                } catch (error) {
                    console.error('Error resetting score:', error);
                    alert('Gagal mereset skor');
                }
            }
        });
    }

    // Setup win screen refresh button
    const winRefreshBtn = document.getElementById('winRefreshBtn');
    if (winRefreshBtn) {
        winRefreshBtn.addEventListener('click', async function() {
            if (confirm('Apakah Anda yakin ingin mereset skor dan memulai dari awal?')) {
                try {
                    const response = await fetch('/api/reset-score', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'}
                    });
                    
                    if (response.ok) {
                        // Reset UI
                        if (document.getElementById('scoreTeam1')) {
                            document.getElementById('scoreTeam1').textContent = '0';
                        }
                        if (document.getElementById('scoreTeam2')) {
                            document.getElementById('scoreTeam2').textContent = '0';
                        }
                        if (document.getElementById('mainScoreTeam1')) {
                            document.getElementById('mainScoreTeam1').textContent = '0';
                        }
                        if (document.getElementById('mainScoreTeam2')) {
                            document.getElementById('mainScoreTeam2').textContent = '0';
                        }
                        if (document.getElementById('rope-img')) {
                            document.getElementById('rope-img').style.transform = 'translateX(0px)';
                        }
                        
                        // Hide win screen and show game container
                        const gameContainer = document.getElementById('gameContainer');
                        const winScreen = document.getElementById('winScreen');
                        if (winScreen) {
                            winScreen.style.display = 'none';
                            if (gameContainer) {
                                gameContainer.style.display = 'flex';
                            }
                            // Clear confetti
                            const confettiContainer = document.getElementById('confetti');
                            if (confettiContainer) {
                                confettiContainer.innerHTML = '';
                            }
                        }
                        
                        // Reset game state
                        gameWon = false;
                        winningTeam = null;
                        
                        alert('Skor telah direset!');
                    }
                } catch (error) {
                    console.error('Error resetting score:', error);
                    alert('Gagal mereset skor');
                }
            }
        });
    }

    const modeQrBtn = document.getElementById('modeQrBtn');
    const modeScreenBtn = document.getElementById('modeScreenBtn');

    function setDisplayMode(mode) {
        const qrContainer = document.getElementById('qrModeContainer');
        const mainScreen = document.getElementById('mainScreenMode');
        const gameHeader = document.querySelector('.class-game-header');
        const topRope = document.querySelector('.rope-area');

        if (mode === 'screen') {
            if (qrContainer) qrContainer.style.display = 'none';
            if (mainScreen) mainScreen.style.display = 'flex';
            if (gameHeader) gameHeader.style.display = 'none';
            if (topRope) topRope.style.display = 'none';
            if (modeQrBtn) modeQrBtn.classList.remove('active');
            if (modeScreenBtn) modeScreenBtn.classList.add('active');
        } else {
            if (qrContainer) qrContainer.style.display = 'grid';
            if (mainScreen) mainScreen.style.display = 'none';
            if (gameHeader) gameHeader.style.display = 'block';
            if (topRope) topRope.style.display = 'flex';
            if (modeQrBtn) modeQrBtn.classList.add('active');
            if (modeScreenBtn) modeScreenBtn.classList.remove('active');
        }
    }

    if (modeQrBtn && modeScreenBtn) {
        modeQrBtn.addEventListener('click', function() {
            setDisplayMode('qr');
        });
        modeScreenBtn.addEventListener('click', function() {
            setDisplayMode('screen');
            if (typeof initMainScreenMode === 'function' && window.mainScreenQuestionsTeam1 && window.mainScreenQuestionsTeam1.length === 0) {
                initMainScreenMode();
            }
        });
        setDisplayMode('qr');
    }
});

// Update bar & check game status setiap interval
setInterval(updateBar, 1000); // Update visual bar setiap 1 detik
setInterval(checkGameStatus, 500); // Check game status setiap 500ms
