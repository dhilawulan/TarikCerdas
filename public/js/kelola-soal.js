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

    let currentEditId = null;
    let currentLevel = level;
    let pollInterval = null;
    let lastDataHash = null;
    let isFirstLoad = true;

    async function populateCategoryDropdown() {
        const selectElem = document.getElementById('editKategori');
        if (!selectElem) return;

        let semuaKategori;
        try {
            const response = await fetch('/api/categories');
            if (!response.ok) throw new Error('Gagal mengambil daftar kategori.');
            const categories = await response.json();
            semuaKategori = categories.map(category => category.name);
        } catch (error) {
            console.error('Gagal memuat kategori:', error);
            return;
        }

        selectElem.innerHTML = '';

        semuaKategori.forEach(kat => {
            const option = document.createElement('option');
            option.value = kat;
            option.textContent = kat.charAt(0).toUpperCase() + kat.slice(1);
            selectElem.appendChild(option);
        });
    }

    function generateHash(data) {
        return JSON.stringify(data).split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
    }

    if (selectedLevelText) {
        selectedLevelText.textContent = level.charAt(0).toUpperCase() + level.slice(1);
    }

    if (addQuestionBtn) {
        addQuestionBtn.addEventListener('click', () => {
            window.location.href = `/tambah-soal?level=${encodeURIComponent(level)}`;
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            lastDataHash = null;
            loadQuestions();
        });
    }

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!currentEditId) return;

            const opsiA = document.getElementById('editOpsiA').value;
            const opsiB = document.getElementById('editOpsiB').value;
            const opsiC = document.getElementById('editOpsiC').value;
            const opsiD = document.getElementById('editOpsiD').value;
            const opsiE = document.getElementById('editOpsiE') ? document.getElementById('editOpsiE').value : '';
            const selectedLetter = document.getElementById('editJawaban').value;

            let textAnswer = '';
            if (selectedLetter === 'A') textAnswer = opsiA;
            else if (selectedLetter === 'B') textAnswer = opsiB;
            else if (selectedLetter === 'C') textAnswer = opsiC;
            else if (selectedLetter === 'D') textAnswer = opsiD;
            else if (selectedLetter === 'E') textAnswer = opsiE;

            const selectedKategori = document.getElementById('editKategori').value;

            const formData = {
                id: currentEditId,
                pertanyaan: document.getElementById('editPertanyaan').value,
                opsiA: opsiA,
                opsiB: opsiB,
                opsiC: opsiC,
                opsiD: opsiD,
                opsiE: opsiE,
                jawaban: textAnswer,
                kategori: selectedKategori,
                level: selectedKategori
            };

            try {
                const response = await fetch(`/api/soal/edit/${encodeURIComponent(currentEditId)}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok && (result.success || result.status === 'ok')) {
                    showAlert('Soal berhasil diperbarui!', 'success');
                    setTimeout(() => {
                        closeModal();
                        lastDataHash = null;
                        loadQuestions();
                    }, 500);
                } else {
                    showAlert(result.message || 'Gagal memperbarui soal', 'error');
                }
            } catch (err) {
                console.error('Error updating question:', err);
                showAlert('Gagal memperbarui soal. Coba lagi.', 'error');
            }
        });
    }

    function showAlert(message, type) {
        if (!alertContainer) return;
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
            if (!response.ok) throw new Error('Network response was not ok');
            
            const questions = await response.json();
            const dataArr = Array.isArray(questions) ? questions : (questions.questions || []);
            
            const currentHash = generateHash(dataArr);
            
            if (isFirstLoad || lastDataHash !== currentHash) {
                if (!isFirstLoad) {
                    console.log('📊 Data soal berubah (Realtime Update), memperbarui UI...');
                }
                renderQuestions(dataArr);
                lastDataHash = currentHash;
                isFirstLoad = false;
            }
        } catch (err) {
            if (isFirstLoad && questionList) {
                questionList.innerHTML = '<p class="empty-message">Gagal memuat soal. Coba refresh halaman.</p>';
            }
            console.error('Error loading questions:', err);
        }
    }

    function renderQuestions(questions) {
        if (!questionList) return;

        const totalQuestions = questions.length;
        const questionsPerTeam = Math.ceil(totalQuestions / 2);

        if (totalQuestionsElm) totalQuestionsElm.textContent = totalQuestions;
        if (questionsPerTeamElm) questionsPerTeamElm.textContent = questionsPerTeam;

        if (totalQuestions === 0) {
            questionList.innerHTML = '<div class="empty-message">Belum ada soal untuk level ini. Tambahkan soal baru untuk mulai membuat bank soal.</div>';
            return;
        }

        questionList.innerHTML = '';

        questions.forEach((question, index) => {
            const card = document.createElement('div');
            card.className = 'question-card';

            const correctAnswer = (question.jawaban || '').trim();
            const options = [
                { label: 'A', value: question.opsiA || (question.opsi ? question.opsi.A : '') },
                { label: 'B', value: question.opsiB || (question.opsi ? question.opsi.B : '') },
                { label: 'C', value: question.opsiC || (question.opsi ? question.opsi.C : '') },
                { label: 'D', value: question.opsiD || (question.opsi ? question.opsi.D : '') },
                { label: 'E', value: question.opsiE || (question.opsi ? question.opsi.E : '') }
            ];

            const questionId = question.id || index;

            card.innerHTML = `
                <div class="question-card-header">
                    <h3>Pertanyaan ${index + 1}</h3>
                    <div class="question-card-actions">
                        <button type="button" title="Edit soal" class="edit-btn"><i class="fas fa-pen"></i></button>
                        <button type="button" title="Hapus soal" class="delete-btn delete"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="question-card-body">
                    <p>${escapeHtml(question.pertanyaan || '')}</p>
                    <div class="option-grid">
                        ${options.map(opt => {
                            const isCorrect = opt.value.trim() === correctAnswer || opt.label === correctAnswer;
                            return `
                                <div class="option-item${isCorrect ? ' correct' : ''}">
                                    <span>${opt.label}</span>
                                    <strong>${escapeHtml(opt.value)}</strong>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;

            const editBtn = card.querySelector('.edit-btn');
            const deleteBtn = card.querySelector('.delete-btn');

            editBtn.addEventListener('click', () => openEditModal(questionId, question));
            deleteBtn.addEventListener('click', () => {
                if (confirm('Apakah Anda yakin ingin menghapus soal ini?')) {
                    deleteQuestion(questionId);
                }
            });

            questionList.appendChild(card);
        });
    }

    async function openEditModal(questionId, question) {
        currentEditId = questionId;
        
        await populateCategoryDropdown();

        document.getElementById('editPertanyaan').value = question.pertanyaan || '';
        document.getElementById('editOpsiA').value = question.opsiA || (question.opsi ? question.opsi.A : '');
        document.getElementById('editOpsiB').value = question.opsiB || (question.opsi ? question.opsi.B : '');
        document.getElementById('editOpsiC').value = question.opsiC || (question.opsi ? question.opsi.C : '');
        document.getElementById('editOpsiD').value = question.opsiD || (question.opsi ? question.opsi.D : '');
        
        const editOpsiEElem = document.getElementById('editOpsiE');
        if (editOpsiEElem) {
            editOpsiEElem.value = question.opsiE || (question.opsi ? question.opsi.E : '');
        }
        
        const editKategori = document.getElementById('editKategori');
        if (editKategori) {
            editKategori.value = question.level || question.kategori || currentLevel;
        }

        let selectedLetter = 'A';
        const qAns = (question.jawaban || '').trim();
        const optB = (question.opsiB || (question.opsi ? question.opsi.B : '')).trim();
        const optC = (question.opsiC || (question.opsi ? question.opsi.C : '')).trim();
        const optD = (question.opsiD || (question.opsi ? question.opsi.D : '')).trim();
        const optE = (question.opsiE || (question.opsi ? question.opsi.E : '')).trim();

        if (qAns === optB || qAns === 'B') selectedLetter = 'B';
        else if (qAns === optC || qAns === 'C') selectedLetter = 'C';
        else if (qAns === optD || qAns === 'D') selectedLetter = 'D';
        else if (qAns === optE || qAns === 'E') selectedLetter = 'E';

        document.getElementById('editJawaban').value = selectedLetter;

        if (alertContainer) alertContainer.innerHTML = '';
        if (editModal) editModal.classList.add('active');
    }

    async function deleteQuestion(questionId) {
        try {
            const response = await fetch(`/api/soal/delete/${encodeURIComponent(questionId)}`, {
                method: 'POST'
            });

            const result = await response.json();

            if (response.ok && (result.success || result.status === 'ok')) {
                showAlert('Soal berhasil dihapus!', 'success');
                lastDataHash = null;
                setTimeout(() => {
                    loadQuestions();
                }, 300);
            } else {
                alert(result.message || 'Gagal menghapus soal');
            }
        } catch (err) {
            console.error('Error deleting question:', err);
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

    function startPolling() {
        loadQuestions();
        
        if (pollInterval) clearInterval(pollInterval);
        
        pollInterval = setInterval(() => {
            loadQuestions();
        }, 2000);
    }

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

    window.addEventListener('beforeunload', () => {
        if (pollInterval) {
            clearInterval(pollInterval);
        }
    });

    populateCategoryDropdown();
    startPolling();
});

function closeModal() {
    const editModal = document.getElementById('editModal');
    if (editModal) editModal.classList.remove('active');
    
    const editForm = document.getElementById('editForm');
    if (editForm) editForm.reset();
    
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) alertContainer.innerHTML = '';
}

window.addEventListener('click', (event) => {
    const editModal = document.getElementById('editModal');
    if (event.target === editModal) {
        closeModal();
    }
});