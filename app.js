const express = require('express');
const session = require('express-session');
const nodemailer = require('nodemailer');
const path = require('path');
const bcrypt = require('bcryptjs');
const sequelize = require('./config/database');
const User = require('./models/User');
const fs = require('fs');

const app = express();

// Define soal.json path dengan absolute path
const soalJsonPath = path.join(__dirname, 'data', 'soal.json');

// --- MIDDLEWARE ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
    secret: 'tarikcerdas_secret',
    resave: false,
    saveUninitialized: false,
}));

// --- SYNC DATABASE (HANYA SEKALI) ---
sequelize.sync();

const loadSoalData = () => {
    try {
        return JSON.parse(fs.readFileSync(soalJsonPath, 'utf-8'));
    } catch (err) {
        console.error('Error loading soal.json:', err);
        return [];
    }
};

let soalData = loadSoalData();

// =====================
// ROUTE GET
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
    const team = req.query.team || '1';
    
    let filePath = 'views/play-low.html';
    if (level === 'middle') filePath = 'views/play-middle.html';
    if (level === 'high') filePath = 'views/play-high.html';
    
    res.sendFile(path.join(__dirname, filePath));
});

// level
app.get('/low', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/low.html'));
});

app.get('/middle', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/middle.html'));
});

app.get('/high', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/high.html'));
});

// Route dinamis untuk kategori kustom
app.get('/category/:name', (req, res) => {
    const categoryName = req.params.name;
    
    // Generate HTML secara dinamis untuk kategori kustom
    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game - ${categoryName}</title>
    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>

    <div class="class-game-wrapper">
        <div class="class-game-container">
            <!-- Header -->
            <div class="class-game-header">
                <h1>${categoryName}</h1>
                <p>Jawab soal ini untuk menarik tambang</p>
            </div>

            <!-- Rope Game Area -->
            <div class="rope-area">
                <div class="rope-wrapper">
                    <img src="/images/tarik.png" id="rope-img" alt="Tarik Tambang">
                    <div class="center-line"></div>
                </div>
            </div>

            <!-- QR Codes untuk Tim -->
            <div class="qr-codes-container">
                <div class="team-qr">
                    <div class="team-label">
                        <i class="fas fa-users"></i>
                        <h3>TIM 1</h3>
                    </div>
                    <div class="qr-code-box">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=http://localhost:3000/play?team=1&level=${encodeURIComponent(categoryName)}" alt="QR Code Tim 1">
                    </div>
                </div>

                <div class="team-qr">
                    <div class="team-label">
                        <i class="fas fa-users"></i>
                        <h3>TIM 2</h3>
                    </div>
                    <div class="qr-code-box">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=http://localhost:3000/play?team=2&level=${encodeURIComponent(categoryName)}" alt="QR Code Tim 2">
                    </div>
                </div>
            </div>

            <!-- Back Button -->
            <div class="class-game-footer">
                <a href="/dashboard" class="btn-back-game">
                    <i class="fas fa-arrow-left"></i> Kembali ke Dashboard
                </a>
            </div>
        </div>
    </div>

    <script src="/js/game.js"></script>

</body>
</html>
    `;
    
    res.send(html);
});

// Tambah Kategori
app.get('/tambah-soal', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views/tambah-soal.html'));
});

// Tambah Kategori (route was missing causing "Cannot GET /tambah-kategori")
app.get('/tambah-kategori', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views/tambah-kategori.html'));
});

// Kelola Soal
app.get('/kelola-soal', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views/kelola-soal.html'));
});

// EDIT PROFILE - tampilkan form edit profile
app.get('/edit-profile', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views/edit-profile.html'));
});

// EDIT PROFILE - simpan perubahan
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
        // refresh session user data
        req.session.user = user;

        res.send("<script>alert('Profil berhasil diperbarui'); window.location='/dashboard';</script>");
    } catch (err) {
        console.error(err);
        res.send("<script>alert('Gagal memperbarui profil'); window.history.back();</script>");
    }
});

const handleTambahSoal = (req, res) => {
    try {
        const { pertanyaan, opsiA, opsiB, opsiC, opsiD, jawaban, kategori } = req.body;

        const jawabanMap = {
            'A': opsiA,
            'B': opsiB,
            'C': opsiC,
            'D': opsiD
        };

        const soalBaru = {
            pertanyaan,
            opsiA,
            opsiB,
            opsiC,
            opsiD,
            jawaban: jawabanMap[jawaban] || jawaban,
            level: kategori
        };

        let soalData = JSON.parse(fs.readFileSync(soalJsonPath, 'utf-8'));
        soalData.push(soalBaru);
        fs.writeFileSync(soalJsonPath, JSON.stringify(soalData, null, 2));
        
        // Reload global soalData
        soalData = loadSoalData();

        // Check if request accepts JSON
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            res.json({ success: true, message: 'Soal berhasil ditambahkan' });
        } else {
            res.send("<script>alert('Soal berhasil ditambahkan!'); window.location='/dashboard';</script>");
        }
    } catch (err) {
        console.error(err);
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            res.status(500).json({ success: false, message: 'Gagal menambahkan soal', error: err.message });
        } else {
            res.send("<script>alert('Gagal menambahkan soal!'); window.history.back();</script>");
        }
    }
};

app.post('/tambah-soal', handleTambahSoal);
app.post('/kelola-soal', handleTambahSoal);

// EDIT SOAL
app.post('/api/soal/edit/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { pertanyaan, opsiA, opsiB, opsiC, opsiD, jawaban, kategori } = req.body;

        const jawabanMap = {
            'A': opsiA,
            'B': opsiB,
            'C': opsiC,
            'D': opsiD
        };

        let soalData = JSON.parse(fs.readFileSync(soalJsonPath, 'utf-8'));
        const index = parseInt(id);

        if (index >= 0 && index < soalData.length) {
            soalData[index] = {
                pertanyaan,
                opsiA,
                opsiB,
                opsiC,
                opsiD,
                jawaban: jawabanMap[jawaban] || jawaban,
                level: kategori
            };

            fs.writeFileSync(soalJsonPath, JSON.stringify(soalData, null, 2));
            
            // Reload global soalData
            soalData = loadSoalData();
            
            res.json({ success: true, message: 'Soal berhasil diperbarui' });
        } else {
            res.status(404).json({ success: false, message: 'Soal tidak ditemukan' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Gagal mengubah soal', error: err.message });
    }
});

// DELETE SOAL
app.post('/api/soal/delete/:id', (req, res) => {
    try {
        const { id } = req.params;
        let soalData = JSON.parse(fs.readFileSync(soalJsonPath, 'utf-8'));
        const index = parseInt(id);

        if (index >= 0 && index < soalData.length) {
            soalData.splice(index, 1);
            fs.writeFileSync(soalJsonPath, JSON.stringify(soalData, null, 2));
            
            // Reload global soalData
            soalData = loadSoalData();
            
            res.json({ success: true, message: 'Soal berhasil dihapus' });
        } else {
            res.status(404).json({ success: false, message: 'Soal tidak ditemukan' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Gagal menghapus soal', error: err.message });
    }
});

// =====================
// GAME API
// =====================

let skor = { 1: 0, 2: 0 };
let gameStatus = { 1: false, 2: false }; // Track apakah tim sudah selesai menjawab semua soal
let startTime = { 1: null, 2: null }; // timestamp ms when team started
let finishTime = { 1: null, 2: null }; // timestamp ms when team finished

app.get('/api/soal', (req, res) => {
    const level = req.query.level;
    const random = req.query.random; // Parameter untuk mengembalikan 10 soal acak

    const filtered = level ? soalData.filter(s => s.level === level) : soalData;

    if (filtered.length === 0) {
        return res.json({ message: "Soal tidak ditemukan", questions: [] });
    }

    // Jika diminta 10 soal acak untuk bermain
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

    // Jika hanya diminta 1 soal acak
    const randomSoal = filtered[Math.floor(Math.random() * filtered.length)];
    res.json(randomSoal);
});

app.get('/api/soal/all', (req, res) => {
    const level = req.query.level;
    const filtered = level ? soalData.filter(s => s.level === level) : soalData;
    res.json(filtered);
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

// Endpoint baru untuk menandai tim sudah selesai
app.post('/api/finish-game', (req, res) => {
    const team = req.body.team;
    
    if (team === 1 || team === 2) {
        gameStatus[team] = true;
        // record finish time if not set
        if (!finishTime[team]) finishTime[team] = Date.now();
    }
    
    res.json({ success: true, gameStatus, bothFinished: gameStatus[1] && gameStatus[2], finishTime });
});

// Endpoint untuk check status game
app.get('/api/game-status', (req, res) => {
    // compute time spent (ms) for each team if start and finish exist
    const timeSpent = { 1: null, 2: null };
    [1,2].forEach(t => {
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

// Record team start time when play page loads
app.post('/api/start-team', (req, res) => {
    const team = req.body.team;
    if (team === 1 || team === 2) {
        if (!startTime[team]) startTime[team] = Date.now();
        // reset finishTime if previously set
        finishTime[team] = null;
        gameStatus[team] = false;
    }
    res.json({ success: true, startTime, finishTime });
});

app.post('/api/reset-score', (req, res) => {
    skor = { 1: 0, 2: 0 };
    gameStatus = { 1: false, 2: false }; // Reset game status juga
    res.json({ success: true, skor });
});

// =====================
// AUTH
// =====================

// REGISTER
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

// LOGIN
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

// FORGOT PASSWORD
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

// RESET PASSWORD
app.post('/update-password', async (req, res) => {
    const { userId, newPassword } = req.body;

    const user = await User.findByPk(userId);

    if (user) {
        const hash = await bcrypt.hash(newPassword, 10);
        await user.update({ password: hash });
    }

    res.redirect('/login');
});

// LOGOUT
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// SERVER
app.listen(3000, () => {
    console.log('http://localhost:3000');
});