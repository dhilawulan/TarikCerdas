let params = new URLSearchParams(window.location.search);
let team = params.get("team") || "1";
let level = window.forcedLevel || params.get("level") || "low";

let currentQuestion = 0;
let score = 0;
let questions = [];
let answered = false;
let currentAnswer = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Set header
    document.getElementById('levelDisplay').textContent = level.charAt(0).toUpperCase() + level.slice(1) + ' Level';
    document.getElementById('teamDisplay').textContent = `Team: ${team}`;
    
    // Load soal
    await loadQuestions();
    
    // Debug log
    console.log('Level:', level);
    console.log('Team:', team);
    console.log('Questions loaded:', questions.length);
    
    if (questions.length === 0) {
        document.getElementById('pertanyaan').textContent = 'Soal tidak ditemukan untuk level: ' + level;
        return;
    }
    
    displayQuestion();
    
    // Attach event listeners
    document.querySelectorAll('.opsi-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (!answered) {
                selectAnswer(this);
            }
        });
    });
    
    document.getElementById('nextBtn').addEventListener('click', nextQuestion);
});

async function loadQuestions() {
    try {
        const response = await fetch(`/api/soal?level=${level}&random=true`);
        const data = await response.json();
        
        if (Array.isArray(data)) {
            questions = data;
        } else if (data.questions) {
            questions = data.questions;
        } else {
            console.error('Invalid response format');
            questions = [];
        }
    } catch (error) {
        console.error('Error loading questions:', error);
        questions = [];
    }
}

function displayQuestion() {
    if (currentQuestion >= 10 || currentQuestion >= questions.length) {
        showResults();
        return;
    }
    
    const question = questions[currentQuestion];
    
    if (!question) {
        console.error('Question is undefined at index:', currentQuestion);
        return;
    }
    
    // Reset state
    answered = false;
    currentAnswer = null;
    
    // Update progress
    const percentage = ((currentQuestion + 1) / 10) * 100;
    document.getElementById('progressFill').style.width = percentage + '%';
    document.getElementById('questionCount').textContent = (currentQuestion + 1) + '/10';
    
    // Display question
    document.getElementById('pertanyaan').textContent = question.pertanyaan;
    
    // Map opsi dengan letter
    const opsiMap = {
        'A': question.opsiA,
        'B': question.opsiB,
        'C': question.opsiC,
        'D': question.opsiD
    };
    
    // Display options
    document.querySelectorAll('.opsi-btn').forEach(btn => {
        const letter = btn.getAttribute('data-opsi');
        btn.classList.remove('selected', 'correct', 'incorrect');
        btn.disabled = false;
        
        const opsiText = btn.querySelector('.opsi-text');
        opsiText.textContent = opsiMap[letter] || '-';
        btn.setAttribute('data-answer', opsiMap[letter]);
    });
    
    document.getElementById('nextBtn').style.display = 'none';
    
    // Store correct answer
    document.querySelectorAll('.opsi-btn').forEach(btn => {
        const letter = btn.getAttribute('data-opsi');
        btn.setAttribute('data-correct', opsiMap[letter] === question.jawaban);
    });
}

function selectAnswer(button) {
    answered = true;
    currentAnswer = button.getAttribute('data-opsi');
    const isCorrect = button.getAttribute('data-correct') === 'true';
    
    // Show correct/incorrect feedback
    document.querySelectorAll('.opsi-btn').forEach(btn => {
        btn.disabled = true;
        const letter = btn.getAttribute('data-opsi');
        const isAnswerCorrect = btn.getAttribute('data-correct') === 'true';
        
        if (letter === currentAnswer) {
            btn.classList.add(isCorrect ? 'correct' : 'incorrect');
        } else if (isAnswerCorrect) {
            btn.classList.add('correct');
        }
    });
    
    // Update score if correct
    if (isCorrect) {
        score++;
        
        // Send score to server
        fetch("/api/skor", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({team: team})
        }).catch(err => console.error(err));
    }
    
    // Show next button
    document.getElementById('nextBtn').style.display = 'flex';
}

function nextQuestion() {
    currentQuestion++;
    displayQuestion();
}

function showResults() {
    document.getElementById('soalContainer').style.display = 'none';
    document.getElementById('resultsContainer').style.display = 'block';
    document.getElementById('resultMessage').textContent = `Skor Tim ${team}: ${score}/10`;
    
    // Send signal to server that this team finished
    fetch("/api/finish-game", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({team: parseInt(team)})
    }).catch(err => console.error('Error finishing game:', err));
}
