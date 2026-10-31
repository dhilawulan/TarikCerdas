const express = require('express');
const session = require('express-session');
const nodemailer = require('nodemailer');
const path = require('path');
const bcrypt = require('bcryptjs');
const sequelize = require('./config/database');
const User = require('./models/User');
const UserContent = require('./models/userContent');
const fs = require('fs');

const app = express();
const defaultCategories = ['low', 'middle', 'high'];

// Absolute path ke file data JSON
const soalJsonPath = path.join(__dirname, 'data', 'soal.json');
const materiJsonPath = path.join(__dirname, 'data', 'materi.json');

// --- MIDDLEWARE ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
    secret: 'tarikcerdas_secret',
    resave: false,
    saveUninitialized: false,
}));

// Helper untuk membaca file soal.json secara dinamis & realtime
const getSoalData = () => {
    try {
        if (!fs.existsSync(soalJsonPath)) {
            fs.writeFileSync(soalJsonPath, '[]', 'utf-8');
            return [];
        }
        const data = fs.readFileSync(soalJsonPath, 'utf-8');
        return JSON.parse(data || '[]');
    } catch (err) {
        console.error('Error reading soal.json:', err);
        return [];
    }
};

// Helper untuk membaca file materi.json secara dinamis
const getMateriData = () => {
    try {
        if (!fs.existsSync(materiJsonPath)) {
            fs.writeFileSync(materiJsonPath, '{}', 'utf-8');
            return {};
        }
        const data = fs.readFileSync(materiJsonPath, 'utf-8');
        return JSON.parse(data || '{}');
    } catch (err) {
        console.error('Error reading materi.json:', err);
        return {};
    }
};

const getUserContent = async (userId) => {
    const [content] = await UserContent.findOrCreate({
        where: { userId },
        defaults: {
            materials: JSON.stringify({}),
            questions: JSON.stringify([]),
            categories: JSON.stringify(defaultCategories)
        }
    });

    return {
        record: content,
        materials: JSON.parse(content.materials),
        questions: JSON.parse(content.questions),
        categories: JSON.parse(content.categories)
    };
};

const migrateLegacyUserContent = async () => {
    const defaultMaterials = JSON.stringify(getMateriData());
    const defaultQuestions = JSON.stringify(getSoalData());
    const userContents = await UserContent.findAll();

    for (const content of userContents) {
        const updates = {};

        if (JSON.stringify(JSON.parse(content.materials)) === defaultMaterials) {
            updates.materials = JSON.stringify({});
        }
        if (JSON.stringify(JSON.parse(content.questions)) === defaultQuestions) {
            updates.questions = JSON.stringify([]);
        }

        if (Object.keys(updates).length > 0) {
            await content.update(updates);
        }
    }
};

const saveUserContent = async (userId, field, value) => {
    const content = await getUserContent(userId);
    await content.record.update({ [field]: JSON.stringify(value) });
};

const requireAuthenticatedUser = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Silakan login untuk mengubah konten.' });
    }
    next();
};

// =====================
// ROUTE GET (HTML VIEWS)
// =====================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/register.html'));
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views/dashboard.html'));
});

app.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/forgot-password.html'));
});

app.get('/reset-password/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/reset-password.html'));
});

app.get('/game', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views/game.html'));
});

app.get('/play', (req, res) => {
    const level = req.query.level || 'low';
    
    let filePath = 'views/play-low.html';
    if (level === 'middle') filePath = 'views/play-middle.html';
    if (level === 'high') filePath = 'views/play-high.html';
    
    res.sendFile(path.join(__dirname, filePath));
});

// Level Pages
app.get('/low', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/low.html'));
});

app.get('/middle', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/middle.html'));
});

app.get('/high', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/high.html'));
});

// Route Kategori Dinamis / Custom
app.get('/category/:name', (req, res) => {
    const categoryName = req.params.name;

    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kategori - ${categoryName}</title>
    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>

    <!-- 1. TAMPILAN MATERI SEBELUM KUIS -->
    <div class="intro-summary-wrapper" id="summarySection">
        <div class="cards-container" id="categoryMaterials" data-category="${categoryName}">
            <!-- Kartu materi & tombol Lanjut ke Kuis akan dimuat rapi oleh data-category.js -->
        </div>
    </div>

    <!-- 2. GAME MODE VIEW -->
    <div class="class-game-wrapper" id="quizSection" style="display: none;">
        <div class="class-game-container" id="gameContainer" style="display: flex; flex-direction: column;">
            
            <!-- Header dengan Skor Tim 1 & Tim 2 -->
            <div class="class-game-header">
                <div class="scores-display">
                    <div class="score-team">
                        <h3>Skor Tim 1</h3>
                        <div class="score-value" id="scoreTeam1">0</div>
                    </div>
                    <h1>${categoryName}</h1>
                    <div class="score-team">
                        <h3>Skor Tim 2</h3>
                        <div class="score-value" id="scoreTeam2">0</div>
                    </div>
                </div>
                <p>Jawab soal ini untuk menarik tambang</p>
            </div>

            <!-- Rope Game Area -->
            <div class="rope-area">
                <div class="rope-wrapper">
                    <img src="/images/tarik.png" id="rope-img" alt="Tarik Tambang">
                    <div class="center-line"></div>
                </div>
            </div>

            <!-- MODE SWITCH BUTTONS (PILIHAN SCAN QR / MAIN DI LAYAR) -->
            <div class="mode-switch">
                <button id="modeQrBtn" class="mode-btn active">Scan QR</button>
                <button id="modeScreenBtn" class="mode-btn">Main di Layar</button>
            </div>

            <!-- MODE 1: QR Codes untuk Tim -->
            <div class="qr-codes-container" id="qrModeContainer">
                <div class="team-qr">
                    <div class="team-label">
                        <i class="fas fa-users"></i>
                        <h3>TIM 1</h3>
                    </div>
                    <div class="qr-code-box">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=http://localhost:3000/play?team=1%26level=${encodeURIComponent(categoryName)}" alt="QR Code Tim 1">
                    </div>
                </div>

                <div class="team-qr">
                    <div class="team-label">
                        <i class="fas fa-users"></i>
                        <h3>TIM 2</h3>
                    </div>
                    <div class="qr-code-box">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=http://localhost:3000/play?team=2%26level=${encodeURIComponent(categoryName)}" alt="QR Code Tim 2">
                    </div>
                </div>
            </div>

            <!-- MODE 2: MAIN SCREEN DISPLAY MODE -->
            <div id="mainScreenMode" class="main-screen-mode" style="display: none;">
                <div class="main-screen-display-header">
                    <h1 id="mainGameTitle">Jawab soal ini untuk menarik tambang</h1>
                    <div class="main-progress-bar">
                        <div id="mainProgressFill" class="main-progress-fill"></div>
                    </div>
                </div>

                <div class="main-screen-section">
                    <div class="main-scores-display">
                        <div class="main-score-team">
                            <h3>Skor Tim 1</h3>
                            <p class="main-score-value" id="mainScoreTeam1">0</p>
                        </div>
                        
                        <div class="main-rope-container">
                            <img src="/images/tarik.png" id="mainRopeImg" alt="Tarik Tambang" class="main-rope">
                            <div class="main-center-line"></div>
                        </div>
                        
                        <div class="main-score-team">
                            <h3>Skor Tim 2</h3>
                            <p class="main-score-value" id="mainScoreTeam2">0</p>
                        </div>
                    </div>
                </div>

                <div class="main-questions-container">
                    <!-- Tim 1 Question -->
                    <div class="main-team-question-box" id="team1QuestionBox">
                        <div class="main-question-label">
                            <span class="main-team-indicator tim-1">TIM 1</span>
                        </div>
                        <div class="main-question-content">
                            <h3 id="mainQuestion1" class="main-question-text">Loading...</h3>
                            <div class="main-options-grid">
                                <button class="main-opsi-btn" data-opsi="A" data-team="1">
                                    <span class="main-opsi-letter">A</span>
                                    <span class="main-opsi-text" id="mainOpsi1A">-</span>
                                </button>
                                <button class="main-opsi-btn" data-opsi="B" data-team="1">
                                    <span class="main-opsi-letter">B</span>
                                    <span class="main-opsi-text" id="mainOpsi1B">-</span>
                                </button>
                                <button class="main-opsi-btn" data-opsi="C" data-team="1">
                                    <span class="main-opsi-letter">C</span>
                                    <span class="main-opsi-text" id="mainOpsi1C">-</span>
                                </button>
                                <button class="main-opsi-btn" data-opsi="D" data-team="1">
                                    <span class="main-opsi-letter">D</span>
                                    <span class="main-opsi-text" id="mainOpsi1D">-</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Tim 2 Question -->
                    <div class="main-team-question-box" id="team2QuestionBox">
                        <div class="main-question-label">
                            <span class="main-team-indicator tim-2">TIM 2</span>
                        </div>
                        <div class="main-question-content">
                            <h3 id="mainQuestion2" class="main-question-text">Loading...</h3>
                            <div class="main-options-grid">
                                <button class="main-opsi-btn" data-opsi="A" data-team="2">
                                    <span class="main-opsi-letter">A</span>
                                    <span class="main-opsi-text" id="mainOpsi2A">-</span>
                                </button>
                                <button class="main-opsi-btn" data-opsi="B" data-team="2">
                                    <span class="main-opsi-letter">B</span>
                                    <span class="main-opsi-text" id="mainOpsi2B">-</span>
                                </button>
                                <button class="main-opsi-btn" data-opsi="C" data-team="2">
                                    <span class="main-opsi-letter">C</span>
                                    <span class="main-opsi-text" id="mainOpsi2C">-</span>
                                </button>
                                <button class="main-opsi-btn" data-opsi="D" data-team="2">
                                    <span class="main-opsi-letter">D</span>
                                    <span class="main-opsi-text" id="mainOpsi2D">-</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="main-screen-status-bar">
                    <span id="mainStatusText">Menunggu Tim...</span>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="class-game-footer">
                <button id="refreshBtn" class="btn-refresh">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
                <a href="/kelola-soal?level=${encodeURIComponent(categoryName)}" class="btn-back-game btn-manage guru-only-btn">
                    <i class="fas fa-pen"></i> Kelola Soal
                </a>
                <a href="/dashboard" class="btn-back-game">
                    <i class="fas fa-arrow-left"></i> Kembali ke Dashboard
                </a>
            </div>
        </div>

        <!-- WIN SCREEN VIEW -->
        <div id="winScreen" class="win-screen-integrated" style="display: none;">
            <div class="confetti-container" id="confetti"></div>
            
            <div class="win-header">
                <div class="win-scores-top">
                    <div class="win-score-column">
                        <h3>Skor Tim 1</h3>
                        <p class="win-score-value-top" id="winScoreTeam1Top">0</p>
                    </div>
                    <div class="win-title-center">
                        <h1 id="winTitle">TIM 1 MENANG</h1>
                    </div>
                    <div class="win-score-column">
                        <h3>Skor Tim 2</h3>
                        <p class="win-score-value-top" id="winScoreTeam2Top">0</p>
                    </div>
                </div>
                <p class="win-level">${categoryName}</p>
                <p class="win-message">Selamat! Kekompakan tim kalian berhasil menaklukkan tantangan ini!</p>
            </div>

            <div class="rope-area">
                <div class="rope-wrapper">
                    <img src="/images/tarik.png" id="rope-img-win" alt="Tarik Tambang" class="rope-img-win">
                    <div class="center-line"></div>
                </div>
            </div>

            <div class="trophy-display-simple">
                <i class="fas fa-trophy trophy-gold-icon"></i>
            </div>

            <div class="win-qr-codes-container">
                <div class="win-team-qr">
                    <h3>TIM 1</h3>
                    <div class="win-qr-box">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=http://localhost:3000/play?team=1%26level=${encodeURIComponent(categoryName)}" alt="QR Code Tim 1">
                    </div>
                </div>
                <div class="win-team-qr">
                    <h3>TIM 2</h3>
                    <div class="win-qr-box">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=http://localhost:3000/play?team=2%26level=${encodeURIComponent(categoryName)}" alt="QR Code Tim 2">
                    </div>
                </div>
            </div>

            <div class="win-buttons">
                <button id="winRefreshBtn" class="btn-win-refresh">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
                <a href="/dashboard" class="btn-win-back">
                    <i class="fas fa-arrow-left"></i> Kembali ke Dashboard
                </a>
            </div>
        </div>
    </div>

    <!-- SCRIPT NAVIGASI & KONTROL PEMBATASAN SISWA -->
    <script>
        window.gameLevel = '${categoryName}';

        function startQuiz() {
            localStorage.setItem('activeSection', 'quiz');
            document.getElementById('summarySection').style.display = 'none';
            document.getElementById('quizSection').style.display = 'block';
        }

        function toggleEdit(id) {
            const userRole = localStorage.getItem('userRole') || 'guru';
            if (userRole === 'siswa') return;
            const elem = document.getElementById(id);
            if (elem) elem.focus();
        }

        document.addEventListener('DOMContentLoaded', function() {
            const userRole = localStorage.getItem('userRole') || 'guru';

            // FUNGSI PENYEMBUNYIAN KETAT UNTUK MODE SISWA
            function hideGuruElements() {
                if (userRole === 'siswa') {
                    const selectorsToHide = [
                        '.guru-only-btn',
                        '.btn-manage',
                        '.edit-materi-btn',
                        '.btn-edit-materi',
                        '.btn-save-materi',
                        '.btn-edit',
                        '.edit-timer-btn',
                        '.btn-edit-timer',
                        '#editTimerBtn',
                        '#saveMateriBtn',
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

            // Jalankan saat pertama kali dimuat
            hideGuruElements();

            // Gunakan MutationObserver untuk memantau jika materi dimuat secara dinamis via AJAX/fetch
            const observer = new MutationObserver(() => {
                hideGuruElements();
            });

            observer.observe(document.body, { childList: true, subtree: true });

            // Penjaga Tampilan Materi / Quiz saat Refresh
            const activeSection = localStorage.getItem('activeSection');
            if (activeSection === 'quiz') {
                document.getElementById('summarySection').style.display = 'none';
                document.getElementById('quizSection').style.display = 'block';
            } else {
                document.getElementById('summarySection').style.display = 'block';
                document.getElementById('quizSection').style.display = 'none';
            }
        });
    </script>
    <script src="/js/data-category.js"></script>
    <script src="/js/game.js"></script>
    <script src="/js/main-screen.js"></script>

</body>
</html>
    `;
    
    res.send(html);
});

// Tambah Soal Page
app.get('/tambah-soal', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views/tambah-soal.html'));
});

// Tambah Kategori Page
app.get('/tambah-kategori', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views/tambah-kategori.html'));
});

// Kelola Soal Page
app.get('/kelola-soal', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views/kelola-soal.html'));
});

// EDIT PROFILE
app.get('/edit-profile', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views/edit-profile.html'));
});

app.post('/edit-profile', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    try {
        const { fullname, email, password } = req.body;
        const user = await User.findByPk(req.session.user.id);

        if (!user) {
            return res.send("<script>alert('User tidak ditemukan'); window.location='/dashboard';</script>");
        }

        const updates = { fullname, email };
        if (password && password.trim() !== '') {
            updates.password = await bcrypt.hash(password, 10);
        }

        await user.update(updates);
        req.session.user = user;

        res.send("<script>alert('Profil berhasil diperbarui'); window.location='/dashboard';</script>");
    } catch (err) {
        console.error(err);
        res.send("<script>alert('Gagal memperbarui profil'); window.history.back();</script>");
    }
});

// =====================
// MATERI API (SERVER-SIDE)
// =====================

app.get('/api/materi/:kategori', async (req, res) => {
    try {
        const category = req.params.kategori;
        const content = req.session.user ? await getUserContent(req.session.user.id) : null;
        const materiData = content ? content.materials : {};
        const isDefaultCategory = defaultCategories.includes(category.toLowerCase());
        const materi = materiData[category] || (isDefaultCategory
            ? { cards: [{ judul: '', isi: '' }, { judul: '', isi: '' }] }
            : { judul: category, isi: '' });

        res.json({ ...materi, canEdit: Boolean(req.session.user) });
    } catch (error) {
        console.error('Gagal mengambil materi:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil materi.' });
    }
});

const handleSaveMateri = async (req, res) => {
    try {
        const category = req.params.kategori;
        const content = await getUserContent(req.session.user.id);
        const { judul, isi, cards } = req.body;
        content.materials[category] = Array.isArray(cards)
            ? { cards }
            : { judul: judul || category, isi: isi || '' };
        await saveUserContent(req.session.user.id, 'materials', content.materials);

        res.json({ success: true, message: 'Materi berhasil disimpan' });
    } catch (error) {
        console.error('Gagal menyimpan materi:', error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan materi.' });
    }
};

app.post('/api/materi/:kategori', requireAuthenticatedUser, handleSaveMateri);
app.put('/api/materi/:kategori', requireAuthenticatedUser, handleSaveMateri);

app.get('/api/categories', async (req, res) => {
    try {
        const content = req.session.user ? await getUserContent(req.session.user.id) : null;
        const categories = content ? content.categories : defaultCategories;
        res.json(categories.map(name => ({ name })));
    } catch (error) {
        console.error('Gagal mengambil kategori:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil kategori.' });
    }
});

app.post('/api/categories', requireAuthenticatedUser, async (req, res) => {
    try {
        if (!Array.isArray(req.body.categories) || req.body.categories.some(category => typeof category !== 'string')) {
            return res.status(400).json({ success: false, message: 'Daftar kategori tidak valid.' });
        }

        const categories = [...defaultCategories];
        req.body.categories.forEach(category => {
            const name = category.trim();
            if (name && !categories.some(existing => existing.toLowerCase() === name.toLowerCase())) {
                categories.push(name);
            }
        });

        await saveUserContent(req.session.user.id, 'categories', categories);
        res.json({ success: true, categories: categories.map(name => ({ name })) });
    } catch (error) {
        console.error('Gagal menyimpan kategori:', error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan kategori.' });
    }
});

// =====================
// SOAL API & CONTROLLER
// =====================

const handleTambahSoal = async (req, res) => {
    try {
        const { id, pertanyaan, opsiA, opsiB, opsiC, opsiD, jawaban, kategori, level, opsi } = req.body;

        const targetLevel = level || kategori || 'low';

        const finalOpsiA = opsiA || (opsi ? opsi.A : '');
        const finalOpsiB = opsiB || (opsi ? opsi.B : '');
        const finalOpsiC = opsiC || (opsi ? opsi.C : '');
        const finalOpsiD = opsiD || (opsi ? opsi.D : '');

        const jawabanMap = {
            'A': finalOpsiA,
            'B': finalOpsiB,
            'C': finalOpsiC,
            'D': finalOpsiD
        };

        const soalBaru = {
            id: id || 'soal-' + Date.now(),
            pertanyaan,
            opsiA: finalOpsiA,
            opsiB: finalOpsiB,
            opsiC: finalOpsiC,
            opsiD: finalOpsiD,
            opsi: {
                A: finalOpsiA,
                B: finalOpsiB,
                C: finalOpsiC,
                D: finalOpsiD
            },
            jawaban: jawabanMap[jawaban] || jawaban,
            level: targetLevel,
            kategori: targetLevel
        };

        const content = await getUserContent(req.session.user.id);
        const currentData = content.questions;
        currentData.push(soalBaru);
        await saveUserContent(req.session.user.id, 'questions', currentData);

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({ success: true, message: 'Soal berhasil ditambahkan', soal: soalBaru });
        } else {
            return res.send("<script>alert('Soal berhasil ditambahkan!'); window.location='/kelola-soal?level=" + encodeURIComponent(targetLevel) + "';</script>");
        }
    } catch (err) {
        console.error('Error adding question:', err);
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ success: false, message: 'Gagal menambahkan soal', error: err.message });
        } else {
            return res.send("<script>alert('Gagal menambahkan soal!'); window.history.back();</script>");
        }
    }
};

app.post('/tambah-soal', requireAuthenticatedUser, handleTambahSoal);
app.post('/api/soal', requireAuthenticatedUser, handleTambahSoal);
app.post('/kelola-soal', requireAuthenticatedUser, handleTambahSoal);

const handleEditSoal = async (req, res) => {
    try {
        const { id } = req.params;
        const { pertanyaan, opsiA, opsiB, opsiC, opsiD, jawaban, kategori, level, opsi } = req.body;

        const targetLevel = level || kategori || 'low';
        const content = await getUserContent(req.session.user.id);
        let currentData = content.questions;

        let index = currentData.findIndex(q => String(q.id) === String(id));

        if (index === -1 && !isNaN(id) && currentData[parseInt(id)]) {
            index = parseInt(id);
        }

        if (index !== -1) {
            const finalOpsiA = opsiA || (opsi ? opsi.A : '');
            const finalOpsiB = opsiB || (opsi ? opsi.B : '');
            const finalOpsiC = opsiC || (opsi ? opsi.C : '');
            const finalOpsiD = opsiD || (opsi ? opsi.D : '');

            const jawabanMap = {
                'A': finalOpsiA,
                'B': finalOpsiB,
                'C': finalOpsiC,
                'D': finalOpsiD
            };

            currentData[index] = {
                ...currentData[index],
                pertanyaan: pertanyaan || currentData[index].pertanyaan,
                opsiA: finalOpsiA,
                opsiB: finalOpsiB,
                opsiC: finalOpsiC,
                opsiD: finalOpsiD,
                opsi: {
                    A: finalOpsiA,
                    B: finalOpsiB,
                    C: finalOpsiC,
                    D: finalOpsiD
                },
                jawaban: jawabanMap[jawaban] || jawaban || currentData[index].jawaban,
                level: targetLevel,
                kategori: targetLevel,
                id: currentData[index].id || id
            };

            await saveUserContent(req.session.user.id, 'questions', currentData);
            return res.json({ success: true, message: 'Soal berhasil diperbarui' });
        } else {
            return res.status(404).json({ success: false, message: 'Soal tidak ditemukan' });
        }
    } catch (err) {
        console.error('Error editing question:', err);
        return res.status(500).json({ success: false, message: 'Gagal mengubah soal', error: err.message });
    }
};

app.post('/api/soal/edit/:id', requireAuthenticatedUser, handleEditSoal);
app.put('/api/soal/edit/:id', requireAuthenticatedUser, handleEditSoal);

const handleDeleteSoal = async (req, res) => {
    try {
        const { id } = req.params;
        const content = await getUserContent(req.session.user.id);
        let currentData = content.questions;

        const initialLength = currentData.length;
        let filteredData = currentData.filter(q => String(q.id) !== String(id));

        if (filteredData.length === initialLength && !isNaN(id) && currentData[parseInt(id)]) {
            currentData.splice(parseInt(id), 1);
            filteredData = currentData;
        }

        if (filteredData.length < initialLength) {
            await saveUserContent(req.session.user.id, 'questions', filteredData);
            return res.json({ success: true, message: 'Soal berhasil dihapus' });
        } else {
            return res.status(404).json({ success: false, message: 'Soal tidak ditemukan' });
        }
    } catch (err) {
        console.error('Error deleting question:', err);
        return res.status(500).json({ success: false, message: 'Gagal menghapus soal', error: err.message });
    }
};

app.post('/api/soal/delete/:id', requireAuthenticatedUser, handleDeleteSoal);
app.delete('/api/soal/delete/:id', requireAuthenticatedUser, handleDeleteSoal);

// =====================
// GAME API
// =====================

let skor = { 1: 0, 2: 0 };
let gameStatus = { 1: false, 2: false };
let startTime = { 1: null, 2: null };
let finishTime = { 1: null, 2: null };

app.get('/api/soal', async (req, res) => {
    try {
        const level = req.query.level;
        const random = req.query.random;

        const content = req.session.user ? await getUserContent(req.session.user.id) : null;
        const currentData = content ? content.questions : [];
        const filtered = level ? currentData.filter(s => s.level === level || s.kategori === level) : currentData;

        if (filtered.length === 0) {
            return res.json([]);
        }

        if (random === 'true') {
            const questions = [];
            const availableSoal = [...filtered];

            for (let i = 0; i < 10 && availableSoal.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * availableSoal.length);
                questions.push(availableSoal[randomIndex]);
                availableSoal.splice(randomIndex, 1);
            }

            return res.json(questions);
        }

        res.json(filtered);
    } catch (error) {
        console.error('Gagal mengambil soal:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil soal.' });
    }
});

app.get('/api/soal/all', async (req, res) => {
    try {
        const level = req.query.level;
        const content = req.session.user ? await getUserContent(req.session.user.id) : null;
        const currentData = content ? content.questions : [];
        const filtered = level ? currentData.filter(s => s.level === level || s.kategori === level) : currentData;
        res.json(filtered);
    } catch (error) {
        console.error('Gagal mengambil daftar soal:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil daftar soal.' });
    }
});

app.post('/api/skor', (req, res) => {
    const team = req.body.team;
    if (!skor[team]) skor[team] = 0;
    skor[team]++;
    res.json({ success: true, skor });
});

app.get('/api/score', (req, res) => {
    res.json(skor);
});

app.post('/api/finish-game', (req, res) => {
    const team = req.body.team;
    if (team === 1 || team === 2) {
        gameStatus[team] = true;
        if (!finishTime[team]) finishTime[team] = Date.now();
    }
    res.json({ success: true, gameStatus, bothFinished: gameStatus[1] && gameStatus[2], finishTime });
});

app.get('/api/game-status', (req, res) => {
    const timeSpent = { 1: null, 2: null };
    [1, 2].forEach(t => {
        if (startTime[t] && finishTime[t]) {
            timeSpent[t] = finishTime[t] - startTime[t];
        } else if (startTime[t] && !finishTime[t]) {
            timeSpent[t] = Date.now() - startTime[t];
        }
    });

    res.json({ 
        gameStatus, 
        bothFinished: gameStatus[1] && gameStatus[2],
        skor,
        startTime,
        finishTime,
        timeSpent
    });
});

app.post('/api/start-team', (req, res) => {
    const team = req.body.team;
    if (team === 1 || team === 2) {
        if (!startTime[team]) startTime[team] = Date.now();
        finishTime[team] = null;
        gameStatus[team] = false;
    }
    res.json({ success: true, startTime, finishTime });
});

app.post('/api/reset-score', (req, res) => {
    skor = { 1: 0, 2: 0 };
    gameStatus = { 1: false, 2: false };
    startTime = { 1: null, 2: null };
    finishTime = { 1: null, 2: null };
    
    res.json({ success: true, message: 'Game status berhasil di-reset total', skor });
});

// =====================
// AUTH ROUTES
// =====================

app.post('/register', async (req, res) => {
    try {
        const { fullname, email, username, password } = req.body;
        const hash = await bcrypt.hash(password, 10);

        await User.create({
            fullname,
            email,
            username,
            password: hash
        });

        res.send("<script>alert('Berhasil daftar!'); window.location='/login';</script>");
    } catch (err) {
        console.error(err);
        res.send("<script>alert('Gagal daftar!'); window.history.back();</script>");
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });

    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = user;
        res.redirect('/dashboard');
    } else {
        res.redirect('/login?error=1');
    }
});

app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
        return res.send("<script>alert('Email tidak ditemukan!'); window.history.back();</script>");
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const link = `http://localhost:3000/reset-password/${user.id}`;

    await transporter.sendMail({
        to: email,
        subject: 'Reset Password',
        html: `<a href="${link}">Klik untuk reset password</a>`
    });

    res.send("<script>alert('Cek email Anda!'); window.location='/login';</script>");
});

app.post('/update-password', async (req, res) => {
    const { userId, newPassword } = req.body;
    const user = await User.findByPk(userId);

    if (user) {
        const hash = await bcrypt.hash(newPassword, 10);
        await user.update({ password: hash });
    }

    res.redirect('/login');
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// =====================
// START SERVER
// =====================
sequelize.sync()
    .then(async () => {
        await migrateLegacyUserContent();
        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Server berjalan di http://localhost:${port}`);
        });
    })
    .catch(error => {
        console.error('Gagal menyiapkan database:', error);
        process.exitCode = 1;
    });