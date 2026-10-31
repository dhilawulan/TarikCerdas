// Main Screen Interactive Game Mode dengan Autostart Timer, Dynamic Rope Images & Notification Bubble
window.mainScreenQuestionsTeam1 = [];
window.mainScreenQuestionsTeam2 = [];
window.mainScreenIndexTeam1 = 0;
window.mainScreenIndexTeam2 = 0;
window.mainScreenFinished = { 1: false, 2: false };

// Riwayat Jawaban Salah untuk Fitur Perbaikan/Bonus
window.wrongQuestionsTeam1 = [];
window.wrongQuestionsTeam2 = [];
window.isRemedialModeTeam1 = false;
window.isRemedialModeTeam2 = false;

// Variabel Timer
window.quizTimerInterval = null;
window.quizTimeLeft = 600; // Default 10 menit
window.isTimerStarted = false; // Flag penanda apakah timer sudah dimulai

const mainScreenAnsweredCountdown = 2000; // delay setelah menjawab (ms)

function initMainScreenMode() {
    loadTimerSetting();
    loadMainScreenQuestions();
    setupMainScreenEventListeners();
    injectMainScreenStyles();
}

// --- LOGIKA PEMBARUAN GAMBAR TARIK TAMBANG DAN KEMENANGAN DINAMIS ---
function updateDynamicRopeImage(score1, score2) {
    let imageSrc = '/images/tarik.png'; // Default jika skor seimbang (0-0, 1-1, dst.)

    const suffixes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

    if (score1 > score2) {
        // Tim 1 Unggul
        // Ambil indeks sesuai skor (skor 1 -> 'a', skor 10 -> 'j', > 10 tetap 'j')
        const index = Math.min(score1, 10) - 1;
        if (index >= 0) {
            imageSrc = `/images/tarik1${suffixes[index]}.png`;
        }
    } else if (score2 > score1) {
        // Tim 2 Unggul
        const index = Math.min(score2, 10) - 1;
        if (index >= 0) {
            imageSrc = `/images/tarik2${suffixes[index]}.png`;
        }
    }

    // Update elemen gambar di Mode QR Scan & Mode Main di Layar
    const ropeImg = document.getElementById('rope-img');
    if (ropeImg) ropeImg.src = imageSrc;

    const mainRopeImg = document.getElementById('mainRopeImg');
    if (mainRopeImg) mainRopeImg.src = imageSrc;
}

function updateWinScreenRopeImage(winningTeam) {
    const winRopeImg = document.getElementById('rope-img-win');
    if (winRopeImg) {
        if (winningTeam === 1) {
            winRopeImg.src = '/images/tim_1.png';
        } else if (winningTeam === 2) {
            winRopeImg.src = '/images/tim_2.png';
        } else if (winningTeam === 'seri') {
            winRopeImg.src = '/images/seri.png';
        }
    }
}

// Injeksi CSS warna tombol & Bubble
function injectMainScreenStyles() {
    if (document.getElementById('main-screen-custom-styles')) return;
    const style = document.createElement('style');
    style.id = 'main-screen-custom-styles';
    style.innerHTML = `
        .main-opsi-btn {
            transition: all 0.3s ease !important;
        }
        .main-opsi-btn.correct {
            background-color: #28a745 !important;
            color: #ffffff !important;
            border-color: #1e7e34 !important;
            box-shadow: 0 0 12px rgba(40, 167, 69, 0.6) !important;
        }
        .main-opsi-btn.incorrect, .main-opsi-btn.wrong {
            background-color: #dc3545 !important;
            color: #ffffff !important;
            border-color: #bd2130 !important;
            box-shadow: 0 0 12px rgba(220, 53, 69, 0.6) !important;
        }
        .main-team-question-box {
            position: relative !important;
        }
        .remedial-bubble {
            position: absolute;
            top: -18px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #ff2a8d 0%, #9a1b5d 100%);
            color: #ffffff;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            box-shadow: 0 4px 15px rgba(255, 42, 141, 0.5);
            white-space: nowrap;
            z-index: 10;
            animation: bounceBubble 1.5s infinite ease-in-out;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .remedial-bubble::after {
            content: '';
            position: absolute;
            bottom: -6px;
            left: 50%;
            transform: translateX(-50%);
            border-width: 6px 6px 0 6px;
            border-style: solid;
            border-color: #9a1b5d transparent transparent transparent;
        }
        @keyframes bounceBubble {
            0%, 100% { transform: translate(-50%, 0); }
            50% { transform: translate(-50%, -6px); }
        }
    `;
    document.head.appendChild(style);
}

// --- LOGIKA TIMER ---
function loadTimerSetting() {
    const level = window.gameLevel || 'low';
    const savedMinutes = localStorage.getItem(`tarikCerdas_timer_${level}`) || 10;
    window.quizTimeLeft = parseInt(savedMinutes, 10) * 60;
    window.isTimerStarted = false;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const timerText = document.getElementById('mainTimerText');
    if (!timerText) return;
    const minutes = Math.floor(window.quizTimeLeft / 60);
    const seconds = window.quizTimeLeft % 60;
    timerText.textContent = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function startTimerOnFirstClick() {
    if (window.isTimerStarted) return;
    window.isTimerStarted = true;

    clearInterval(window.quizTimerInterval);
    window.quizTimerInterval = setInterval(() => {
        if (window.quizTimeLeft > 0) {
            window.quizTimeLeft--;
            updateTimerDisplay();
        } else {
            clearInterval(window.quizTimerInterval);
            handleTimeOut();
        }
    }, 1000);
}

function handleTimeOut() {
    const statusElement = document.getElementById('mainStatusText');
    if (statusElement) statusElement.textContent = 'Waktu habis! Kuis telah selesai.';
    
    markTeamFinished(1);
    markTeamFinished(2);
}

function openTimerModal() {
    const level = window.gameLevel || 'low';
    const savedMinutes = localStorage.getItem(`tarikCerdas_timer_${level}`) || 10;
    document.getElementById('inputDurationMinutes').value = savedMinutes;
    document.getElementById('editTimerModal').classList.add('active');
}

function closeTimerModal() {
    document.getElementById('editTimerModal').classList.remove('active');
}

function saveTimerSetting(e) {
    e.preventDefault();
    const minutes = parseInt(document.getElementById('inputDurationMinutes').value, 10) || 10;
    const level = window.gameLevel || 'low';
    
    localStorage.setItem(`tarikCerdas_timer_${level}`, minutes);
    window.quizTimeLeft = minutes * 60;
    window.isTimerStarted = false;
    clearInterval(window.quizTimerInterval);
    updateTimerDisplay();
    closeTimerModal();
    
    loadMainScreenQuestions();
}

// --- LOAD SOAL ---
async function loadMainScreenQuestions() {
    try {
        const level = window.gameLevel || 'low';
        const fetchTeam = async () => {
            const response = await fetch(`/api/soal?level=${level}&random=true`);
            const data = await response.json();
            return Array.isArray(data) ? data : (data.questions || []);
        };

        const [team1Data, team2Data] = await Promise.all([fetchTeam(), fetchTeam()]);
        window.mainScreenQuestionsTeam1 = team1Data;
        window.mainScreenQuestionsTeam2 = team2Data;
        window.mainScreenIndexTeam1 = 0;
        window.mainScreenIndexTeam2 = 0;
        window.mainScreenFinished = { 1: false, 2: false };
        window.wrongQuestionsTeam1 = [];
        window.wrongQuestionsTeam2 = [];
        window.isRemedialModeTeam1 = false;
        window.isRemedialModeTeam2 = false;

        removeRemedialBubbles();

        if (window.mainScreenQuestionsTeam1.length === 0 || window.mainScreenQuestionsTeam2.length === 0) {
            const statusText = document.getElementById('mainStatusText');
            if (statusText) statusText.textContent = 'Belum ada soal. Silakan tambahkan soal di menu Kelola Soal.';
            return;
        }

        displayTeamQuestion(1);
        displayTeamQuestion(2);
        updateProgressBar();
        startMainScreenUpdates();
    } catch (error) {
        console.error('Error loading main screen questions:', error);
        const statusText = document.getElementById('mainStatusText');
        if (statusText) statusText.textContent = 'Gagal memuat soal. Refresh halaman.';
    }
}

function getCurrentQuestionForTeam(team) {
    const isRemedial = team === 1 ? window.isRemedialModeTeam1 : window.isRemedialModeTeam2;
    const index = team === 1 ? window.mainScreenIndexTeam1 : window.mainScreenIndexTeam2;
    const questions = isRemedial 
        ? (team === 1 ? window.wrongQuestionsTeam1 : window.wrongQuestionsTeam2)
        : (team === 1 ? window.mainScreenQuestionsTeam1 : window.mainScreenQuestionsTeam2);
        
    return questions[index] || null;
}

function displayTeamQuestion(team) {
    const question = getCurrentQuestionForTeam(team);
    const questionElement = document.getElementById(team === 1 ? 'mainQuestion1' : 'mainQuestion2');
    const teamButtons = document.querySelectorAll(`.main-opsi-btn[data-team="${team}"]`);

    if (!question || !questionElement) {
        teamButtons.forEach(btn => btn.disabled = true);
        if (!window.mainScreenFinished[team]) {
            checkAndStartRemedial(team);
        }
        return;
    }

    const isRemedial = team === 1 ? window.isRemedialModeTeam1 : window.isRemedialModeTeam2;
    questionElement.textContent = (isRemedial ? '[Bonus] ' : '') + question.pertanyaan;

    const options = {
        A: question.opsiA,
        B: question.opsiB,
        C: question.opsiC,
        D: question.opsiD,
        E: question.opsiE
    };

    const targetJawaban = String(question.jawaban).trim().toLowerCase();

    teamButtons.forEach(btn => {
        const letter = btn.getAttribute('data-opsi');
        const textSpan = btn.querySelector('.main-opsi-text');
        if (textSpan) {
            textSpan.textContent = options[letter] || '-';
        }
        btn.disabled = false;
        
        btn.classList.remove('correct', 'incorrect', 'selected', 'wrong');
        btn.style.backgroundColor = '';
        btn.style.color = '';
        btn.style.borderColor = '';

        const textOpsi = String(options[letter] || '').trim().toLowerCase();
        const letterOpsi = letter.toLowerCase();
        const isCorrect = (targetJawaban === textOpsi) || (targetJawaban === letterOpsi);

        btn.setAttribute('data-correct', isCorrect ? 'true' : 'false');
    });
}

function updateProgressBar() {
    const totalAnswered = Math.min(window.mainScreenIndexTeam1, 10) + Math.min(window.mainScreenIndexTeam2, 10);
    const percentage = Math.round((totalAnswered / 20) * 100);
    const progressFill = document.getElementById('mainProgressFill');
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
}

function setupMainScreenEventListeners() {
    const buttons = document.querySelectorAll('.main-opsi-btn');
    buttons.forEach(btn => {
        btn.removeEventListener('click', handleMainScreenAnswer);
        btn.addEventListener('click', handleMainScreenAnswer);
    });
}

function handleMainScreenAnswer(event) {
    startTimerOnFirstClick();

    const button = event.currentTarget;
    const team = parseInt(button.getAttribute('data-team'), 10);

    if (window.mainScreenFinished[team] || button.disabled) return;

    const isCorrect = button.getAttribute('data-correct') === 'true';
    const teamButtons = document.querySelectorAll(`.main-opsi-btn[data-team="${team}"]`);
    const currentQuestion = getCurrentQuestionForTeam(team);

    teamButtons.forEach(btn => btn.disabled = true);
    button.classList.add('selected');
    
    if (isCorrect) {
        button.classList.add('correct');
        sendScoreToServer(team);
    } else {
        button.classList.add('incorrect');
        showCorrectAnswerForTeam(team);
        
        const wrongList = team === 1 ? window.wrongQuestionsTeam1 : window.wrongQuestionsTeam2;
        const isRemedial = team === 1 ? window.isRemedialModeTeam1 : window.isRemedialModeTeam2;
        
        if (!isRemedial && wrongList.length < 3 && currentQuestion) {
            wrongList.push(currentQuestion);
        }
    }

    window.setTimeout(() => {
        if (team === 1) {
            window.mainScreenIndexTeam1 += 1;
            checkNextQuestion(1);
        } else {
            window.mainScreenIndexTeam2 += 1;
            checkNextQuestion(2);
        }

        updateMainScreenStatus();
        updateProgressBar();
    }, mainScreenAnsweredCountdown);
}

function checkNextQuestion(team) {
    const isRemedial = team === 1 ? window.isRemedialModeTeam1 : window.isRemedialModeTeam2;
    const index = team === 1 ? window.mainScreenIndexTeam1 : window.mainScreenIndexTeam2;
    const questions = isRemedial 
        ? (team === 1 ? window.wrongQuestionsTeam1 : window.wrongQuestionsTeam2)
        : (team === 1 ? window.mainScreenQuestionsTeam1 : window.mainScreenQuestionsTeam2);

    if (index >= 10 || index >= questions.length) {
        if (!isRemedial) {
            checkAndStartRemedial(team);
        } else {
            markTeamFinished(team);
        }
    } else {
        displayTeamQuestion(team);
    }
}

function checkAndStartRemedial(team) {
    const opponentFinished = window.mainScreenFinished[team === 1 ? 2 : 1];
    const wrongList = team === 1 ? window.wrongQuestionsTeam1 : window.wrongQuestionsTeam2;

    if (!opponentFinished && wrongList.length > 0) {
        if (team === 1) {
            window.isRemedialModeTeam1 = true;
            window.mainScreenIndexTeam1 = 0;
            showRemedialBubble(1, `Kerjakan ${wrongList.length} Soal Bonus!`);
            displayTeamQuestion(1);
        } else {
            window.isRemedialModeTeam2 = true;
            window.mainScreenIndexTeam2 = 0;
            showRemedialBubble(2, `Kerjakan ${wrongList.length} Soal Bonus!`);
            displayTeamQuestion(2);
        }
    } else {
        markTeamFinished(team);
    }
}

function showRemedialBubble(team, message) {
    const boxId = team === 1 ? 'team1QuestionBox' : 'team2QuestionBox';
    const questionBox = document.getElementById(boxId);
    if (!questionBox) return;

    const oldBubble = questionBox.querySelector('.remedial-bubble');
    if (oldBubble) oldBubble.remove();

    const bubble = document.createElement('div');
    bubble.className = 'remedial-bubble';
    bubble.innerHTML = `${message}`;
    questionBox.appendChild(bubble);
}

function removeRemedialBubbles() {
    document.querySelectorAll('.remedial-bubble').forEach(b => b.remove());
}

function showCorrectAnswerForTeam(team) {
    const teamButtons = document.querySelectorAll(`.main-opsi-btn[data-team="${team}"]`);
    teamButtons.forEach(btn => {
        if (btn.getAttribute('data-correct') === 'true') {
            btn.classList.add('correct');
        }
    });
}

function markTeamFinished(team) {
    if (window.mainScreenFinished[team]) return;
    window.mainScreenFinished[team] = true;

    const boxId = team === 1 ? 'team1QuestionBox' : 'team2QuestionBox';
    const questionBox = document.getElementById(boxId);
    if (questionBox) {
        const oldBubble = questionBox.querySelector('.remedial-bubble');
        if (oldBubble) oldBubble.remove();
    }

    disableTeamButtons(team);
    sendTeamFinishedToServer(team);
    updateMainScreenStatus();
    
    const opponent = team === 1 ? 2 : 1;
    if (window.mainScreenFinished[opponent]) {
        clearInterval(window.quizTimerInterval);
        
        const score1 = parseInt(document.getElementById('mainScoreTeam1')?.textContent || 0, 10);
        const score2 = parseInt(document.getElementById('mainScoreTeam2')?.textContent || 0, 10);
        if (score1 > score2) {
            updateWinScreenRopeImage(1);
        } else if (score2 > score1) {
            updateWinScreenRopeImage(2);
        } else {
            updateWinScreenRopeImage('seri');
        }
    }
}

function disableTeamButtons(team) {
    document.querySelectorAll(`.main-opsi-btn[data-team="${team}"]`).forEach(btn => {
        btn.disabled = true;
    });
}

function updateMainScreenStatus() {
    const team1Finished = window.mainScreenFinished[1];
    const team2Finished = window.mainScreenFinished[2];
    const statusElement = document.getElementById('mainStatusText');

    if (!statusElement) return;

    if (team1Finished && team2Finished) {
        statusElement.textContent = 'Kedua tim telah selesai! Menunggu hasil akhir...';
        return;
    }

    if (window.isRemedialModeTeam1 && !team1Finished) {
        statusElement.textContent = 'Tim 1 sedang mengerjakan soal bonus sambil menunggu Tim 2...';
        return;
    }

    if (window.isRemedialModeTeam2 && !team2Finished) {
        statusElement.textContent = 'Tim 2 sedang mengerjakan soal bonus sambil menunggu Tim 1...';
        return;
    }

    if (team1Finished) {
        statusElement.textContent = 'Tim 1 selesai. Menunggu Tim 2 selesai...';
        return;
    }

    if (team2Finished) {
        statusElement.textContent = 'Tim 2 selesai. Menunggu Tim 1 selesai...';
        return;
    }

    statusElement.textContent = 'Tim sedang mengerjakan soal...';
}

function sendScoreToServer(team) {
    fetch('/api/skor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team })
    }).catch(err => console.error('Error sending score:', err));
}

function sendTeamFinishedToServer(team) {
    fetch('/api/finish-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team })
    }).catch(err => console.error('Error sending finished status:', err));
}

function startMainScreenUpdates() {
    setInterval(async function() {
        try {
            const response = await fetch('/api/score');
            const data = await response.json();
            const score1Element = document.getElementById('mainScoreTeam1');
            const score2Element = document.getElementById('mainScoreTeam2');
            
            const score1 = data[1] || 0;
            const score2 = data[2] || 0;

            if (score1Element) score1Element.textContent = score1;
            if (score2Element) score2Element.textContent = score2;
            
            const scoreTeam1Top = document.getElementById('scoreTeam1');
            const scoreTeam2Top = document.getElementById('scoreTeam2');
            if (scoreTeam1Top) scoreTeam1Top.textContent = score1;
            if (scoreTeam2Top) scoreTeam2Top.textContent = score2;

            updateMainScreenRope();
        } catch (error) {
            console.error('Error updating main screen scores:', error);
        }
    }, 1000);
}

function updateMainScreenRope() {
    const score1 = parseInt(document.getElementById('mainScoreTeam1')?.textContent || 0, 10);
    const score2 = parseInt(document.getElementById('mainScoreTeam2')?.textContent || 0, 10);
    
    const selisih = score2 - score1;
    let posisi = selisih * 25;
    if (posisi > 150) posisi = 150;
    if (posisi < -150) posisi = -150;
    
    const ropeImg = document.getElementById('mainRopeImg');
    if (ropeImg) ropeImg.style.transform = `translateX(${posisi}px)`;
    
    const topRopeImg = document.getElementById('rope-img');
    if (topRopeImg) topRopeImg.style.transform = `translateX(${posisi}px)`;

    updateDynamicRopeImage(score1, score2);
}

// Inisialisasi Otomatis
injectMainScreenStyles();