document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const level = params.get('level') || 'low';
    const selectedLevelText = document.getElementById('selectedLevelText');
    const totalQuestionsElm = document.getElementById('totalQuestions');
    const questionsPerTeamElm = document.getElementById('questionsPerTeam');
    const questionList = document.getElementById('questionList');
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const alertContainer = document.getElementById('alertContainer');

    let currentEditIndex = null;
    let currentLevel = level;
    let pollInterval = null;
    let lastDataHash = null;
    let isFirstLoad = true;

    // Fungsi untuk generate hash dari data
    function generateHash(data) {
        return JSON.stringify(data).split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
    }

    selectedLevelText.textContent = level.charAt(0).toUpperCase() + level.slice(1);
    addQuestionBtn.addEventListener('click', () => {
        window.location.href = `/tambah-soal?level=${encodeURIComponent(level)}`;
    });

    refreshBtn.addEventListener('click', () => {
        loadQuestions();
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (currentEditIndex === null) return;

        const formData = {
            pertanyaan: document.getElementById('editPertanyaan').value,
            opsiA: document.getElementById('editOpsiA').value,
            opsiB: document.getElementById('editOpsiB').value,
            opsiC: document.getElementById('editOpsiC').value,
            opsiD: document.getElementById('editOpsiD').value,
            jawaban: document.getElementById('editJawaban').value,
            kategori: document.getElementById('editKategori').value
        };

        try {
            const response = await fetch(`/api/soal/edit/${currentEditIndex}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showAlert('Soal berhasil diperbarui!', 'success');
                setTimeout(() => {
                    closeModal();
                    lastDataHash = null; // Reset hash untuk force refresh
                    loadQuestions();
                }, 500);
            } else {
                showAlert(result.message || 'Gagal memperbarui soal', 'error');
            }
        } catch (err) {
            console.error(err);
            showAlert('Gagal memperbarui soal. Coba lagi.', 'error');
        }
    });

    function showAlert(message, type) {
        alertContainer.innerHTML = `<div class="alert ${type} show">${message}</div>`;
        if (type === 'success') {
            setTimeout(() => {
                alertContainer.innerHTML = '';
            }, 3000);
        }
    }

    async function loadQuestions() {
        try {
            const response = await fetch(`/api/soal/all?level=${encodeURIComponent(currentLevel)}`);
            const questions = await response.json();
            
            const currentHash = generateHash(questions);
            
            // Hanya render jika ada perubahan atau first load
            if (isFirstLoad || lastDataHash !== currentHash) {
                if (!isFirstLoad) {
                    console.log('📊 Data soal diperbarui, refresh UI...');
                }
                renderQuestions(questions);
                lastDataHash = currentHash;
                isFirstLoad = false;
            }
        } catch (err) {
            if (isFirstLoad) {
                questionList.innerHTML = '<p class="empty-message">Gagal memuat soal. Coba refresh halaman.</p>';
            }
            console.error(err);
        }
    }

    function renderQuestions(questions) {
        const totalQuestions = questions.length;
        const questionsPerTeam = Math.ceil(totalQuestions / 2);

        totalQuestionsElm.textContent = totalQuestions;
        questionsPerTeamElm.textContent = questionsPerTeam;

        if (totalQuestions === 0) {
            questionList.innerHTML = '<div class="empty-message">Belum ada soal untuk kategori ini. Tambahkan soal baru untuk mulai membuat bank soal.</div>';
            return;
        }

        questionList.innerHTML = '';

        questions.forEach((question, index) => {
            const card = document.createElement('div');
            card.className = 'question-card';

            const correctAnswer = question.jawaban?.trim();
            const options = [
                { label: 'A', value: question.opsiA },
                { label: 'B', value: question.opsiB },
                { label: 'C', value: question.opsiC },
                { label: 'D', value: question.opsiD }
            ];

            card.innerHTML = `
                <div class="question-card-header">
                    <h3>Pertanyaan ${index + 1}</h3>
                    <div class="question-card-actions">
                        <button type="button" title="Edit soal" class="edit-btn"><i class="fas fa-pen"></i></button>
                        <button type="button" title="Hapus soal" class="delete-btn delete"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="question-card-body">
                    <p>${escapeHtml(question.pertanyaan)}</p>
                    <div class="option-grid">
                        ${options.map(opt => `
                            <div class="option-item${opt.value?.trim() === correctAnswer ? ' correct' : ''}">
                                <span>${opt.label}</span>
                                <strong>${escapeHtml(opt.value || '')}</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            const editBtn = card.querySelector('.edit-btn');
            const deleteBtn = card.querySelector('.delete-btn');

            editBtn.addEventListener('click', () => {
                openEditModal(index, question);
            });

            deleteBtn.addEventListener('click', () => {
                if (confirm('Apakah Anda yakin ingin menghapus soal ini?')) {
                    deleteQuestion(index);
                }
            });

            questionList.appendChild(card);
        });
    }

    function openEditModal(index, question) {
        currentEditIndex = index;
        document.getElementById('editPertanyaan').value = question.pertanyaan;
        document.getElementById('editOpsiA').value = question.opsiA;
        document.getElementById('editOpsiB').value = question.opsiB;
        document.getElementById('editOpsiC').value = question.opsiC;
        document.getElementById('editOpsiD').value = question.opsiD;
        document.getElementById('editKategori').value = question.level;

        const answerMap = {
            [question.opsiA]: 'A',
            [question.opsiB]: 'B',
            [question.opsiC]: 'C',
            [question.opsiD]: 'D'
        };
        document.getElementById('editJawaban').value = answerMap[question.jawaban] || '';

        alertContainer.innerHTML = '';
        editModal.classList.add('active');
    }

    async function deleteQuestion(index) {
        try {
            const response = await fetch(`/api/soal/delete/${index}`, {
                method: 'POST'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showAlert('Soal berhasil dihapus!', 'success');
                lastDataHash = null; // Reset hash untuk force refresh
                setTimeout(() => {
                    loadQuestions();
                }, 500);
            } else {
                alert(result.message || 'Gagal menghapus soal');
            }
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus soal. Coba lagi.');
        }
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Real-time polling - check setiap 2 detik
    function startPolling() {
        loadQuestions(); // Load pertama kali
        
        pollInterval = setInterval(() => {
            loadQuestions();
        }, 2000); // Polling setiap 2 detik
    }

    // Stop polling ketika tab tidak aktif
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
        } else {
            startPolling();
        }
    });

    // Cleanup saat halaman ditutup
    window.addEventListener('beforeunload', () => {
        if (pollInterval) {
            clearInterval(pollInterval);
        }
    });

    startPolling();
});

function closeModal() {
    const editModal = document.getElementById('editModal');
    editModal.classList.remove('active');
    document.getElementById('editForm').reset();
    document.getElementById('alertContainer').innerHTML = '';
}

window.addEventListener('click', (event) => {
    const editModal = document.getElementById('editModal');
    if (event.target === editModal) {
        closeModal();
    }
});
