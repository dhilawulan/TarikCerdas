// Main Screen Interactive Game Mode
window.mainScreenQuestionsTeam1 = [];
window.mainScreenQuestionsTeam2 = [];
window.mainScreenIndexTeam1 = 0;
window.mainScreenIndexTeam2 = 0;
window.mainScreenFinished = { 1: false, 2: false };
const mainScreenAnsweredCountdown = 2000; // delay after answer

function initMainScreenMode() {
    loadMainScreenQuestions();
    setupMainScreenEventListeners();
}

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

        if (window.mainScreenQuestionsTeam1.length === 0 || window.mainScreenQuestionsTeam2.length === 0) {
            const statusText = document.getElementById('mainStatusText');
            if (statusText) statusText.textContent = 'Gagal memuat soal untuk salah satu tim.';
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
    const index = team === 1 ? window.mainScreenIndexTeam1 : window.mainScreenIndexTeam2;
    const questions = team === 1 ? window.mainScreenQuestionsTeam1 : window.mainScreenQuestionsTeam2;
    return questions[index] || null;
}

function displayTeamQuestion(team) {
    const question = getCurrentQuestionForTeam(team);
    const questionElement = document.getElementById(team === 1 ? 'mainQuestion1' : 'mainQuestion2');
    const teamButtons = document.querySelectorAll(`.main-opsi-btn[data-team="${team}"]`);

    if (!question || !questionElement) {
        teamButtons.forEach(btn => btn.disabled = true);
        if (!window.mainScreenFinished[team]) {
            markTeamFinished(team);
        }
        return;
    }

    questionElement.textContent = question.pertanyaan;

    const options = {
        A: question.opsiA,
        B: question.opsiB,
        C: question.opsiC,
        D: question.opsiD
    };

    teamButtons.forEach(btn => {
        const letter = btn.getAttribute('data-opsi');
        const textSpan = btn.querySelector('.main-opsi-text');
        if (textSpan) {
            textSpan.textContent = options[letter] || '-';
        }
        btn.disabled = false;
        btn.classList.remove('correct', 'incorrect', 'selected');
        btn.setAttribute('data-correct', options[letter] === question.jawaban);
        btn.setAttribute('data-question-index', team === 1 ? window.mainScreenIndexTeam1 : window.mainScreenIndexTeam2);
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
    const button = event.currentTarget;
    const team = parseInt(button.getAttribute('data-team'), 10);

    if (window.mainScreenFinished[team] || button.disabled) {
        return;
    }

    const isCorrect = button.getAttribute('data-correct') === 'true';
    const teamButtons = document.querySelectorAll(`.main-opsi-btn[data-team="${team}"]`);

    teamButtons.forEach(btn => btn.disabled = true);
    button.classList.add('selected');
    button.classList.add(isCorrect ? 'correct' : 'incorrect');
    showCorrectAnswerForTeam(team);

    if (isCorrect) {
        sendScoreToServer(team);
    }

    window.setTimeout(() => {
        if (team === 1) {
            window.mainScreenIndexTeam1 += 1;
            if (window.mainScreenIndexTeam1 >= 10 || window.mainScreenIndexTeam1 >= window.mainScreenQuestionsTeam1.length) {
                markTeamFinished(1);
            } else {
                displayTeamQuestion(1);
            }
        } else {
            window.mainScreenIndexTeam2 += 1;
            if (window.mainScreenIndexTeam2 >= 10 || window.mainScreenIndexTeam2 >= window.mainScreenQuestionsTeam2.length) {
                markTeamFinished(2);
            } else {
                displayTeamQuestion(2);
            }
        }

        updateMainScreenStatus();
        updateProgressBar();
    }, mainScreenAnsweredCountdown);
}

function showCorrectAnswerForTeam(team) {
    const question = getCurrentQuestionForTeam(team);
    if (!question) return;

    const correctLetter = ['A', 'B', 'C', 'D'].find(letter => {
        return (letter === 'A' && question.opsiA === question.jawaban) ||
            (letter === 'B' && question.opsiB === question.jawaban) ||
            (letter === 'C' && question.opsiC === question.jawaban) ||
            (letter === 'D' && question.opsiD === question.jawaban);
    });

    if (correctLetter) {
        const correctBtn = document.querySelector(`.main-opsi-btn[data-team="${team}"][data-opsi="${correctLetter}"]`);
        if (correctBtn) {
            correctBtn.classList.add('correct');
        }
    }
}

function markTeamFinished(team) {
    if (window.mainScreenFinished[team]) return;
    window.mainScreenFinished[team] = true;
    disableTeamButtons(team);
    sendTeamFinishedToServer(team);
    updateMainScreenStatus();
}

function disableTeamButtons(team) {
    document.querySelectorAll(`.main-opsi-btn[data-team="${team}"]`).forEach(btn => {
        btn.disabled = true;
    });
}

function updateMainScreenStatus() {
    const team1Finished = window.mainScreenFinished[1];
    const team2Finished = window.mainScreenFinished[2];
    const team1Answered = document.querySelectorAll('.main-opsi-btn[data-team="1"].selected').length > 0;
    const team2Answered = document.querySelectorAll('.main-opsi-btn[data-team="2"].selected').length > 0;
    const statusElement = document.getElementById('mainStatusText');

    if (!statusElement) return;

    if (team1Finished && team2Finished) {
        statusElement.textContent = 'Kedua tim selesai! Menunggu hasil akhir...';
        return;
    }

    if (team1Finished) {
        statusElement.textContent = 'Tim 1 selesai. Tim 2 masih mengerjakan...';
        return;
    }

    if (team2Finished) {
        statusElement.textContent = 'Tim 2 selesai. Tim 1 masih mengerjakan...';
        return;
    }

    if (team1Answered && team2Answered) {
        statusElement.textContent = 'Kedua tim sudah menjawab! Lanjut ke soal berikutnya...';
        return;
    }

    if (team1Answered) {
        statusElement.textContent = 'Tim 1 sudah menjawab, tunggu Tim 2...';
        return;
    }

    if (team2Answered) {
        statusElement.textContent = 'Tim 2 sudah menjawab, tunggu Tim 1...';
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
            if (score1Element) score1Element.textContent = data[1] || 0;
            if (score2Element) score2Element.textContent = data[2] || 0;
            updateMainScreenRope();
        } catch (error) {
            console.error('Error updating main screen scores:', error);
        }
    }, 1000);
}

function updateMainScreenRope() {
    const score1 = parseInt(document.getElementById('mainScoreTeam1').textContent) || 0;
    const score2 = parseInt(document.getElementById('mainScoreTeam2').textContent) || 0;
    const selisih = score2 - score1;
    let posisi = selisih * 25;
    if (posisi > 150) posisi = 150;
    if (posisi < -150) posisi = -150;
    const ropeImg = document.getElementById('mainRopeImg');
    if (ropeImg) ropeImg.style.transform = `translateX(${posisi}px)`;
}
