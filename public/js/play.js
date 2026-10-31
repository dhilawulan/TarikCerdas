let params = new URLSearchParams(window.location.search);
let team = params.get("team") || "1";
let level = window.forcedLevel || params.get("level") || "high";

let currentQuestion = 0;
let score = 0;
let questions = [];
let answered = false;
let currentAnswer = null;

// =========================================================
// SISTEM AUDIO KUIS (BACKSOUND PLAYER)
// =========================================================
const quizSound = new Audio('/sounds/quiz-theme.mp3');
quizSound.loop = true;
quizSound.volume = 0.5;

let isAudioPlaying = false;

function playQuizAudioOnAnswer() {
    if (!isAudioPlaying) {
        quizSound.play().then(() => {
            isAudioPlaying = true;
        }).catch(err => {
            console.log("Menunggu interaksi klik tombol untuk memutar audio:", err);
        });
    }
}

function stopQuizAudio() {
    quizSound.pause();
    quizSound.currentTime = 0;
    isAudioPlaying = false;
}

function shuffleArray(array) {
    let currentIndex = array.length, randomIndex;

    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }

    return array;
}

// Data Backup Lengkap (Low, Middle, & High dengan Opsi E)
const backupQuestions = [
    // --- SOAL LEVEL HIGH ---
    {
        id: "soal-108",
        pertanyaan: "Sebuah sekolah memiliki 2.000 data nomor peserta ujian yang sudah diurutkan dari nomor terkecil hingga terbesar. Guru ingin mencari satu nomor peserta tertentu. Algoritma yang paling tepat digunakan adalah ....",
        opsiA: "Bubble sort", opsiB: "Binary search", opsiC: "Insertion sort", opsiD: "Selection sort", opsiE: "Sequential search",
        jawaban: "Binary search", level: "high"
    },
    {
        id: "soal-109",
        pertanyaan: "Seorang guru memiliki data nilai siswa yang belum terurut dan ingin mengetahui apakah nilai 85 terdapat dalam data tersebut. Algoritma pencarian yang paling tepat digunakan adalah ....",
        opsiA: "Binary search", opsiB: "Sequential search", opsiC: "Selection sort", opsiD: "Insertion sort", opsiE: "Merge sort",
        jawaban: "Sequential search", level: "high"
    },
    {
        id: "soal-110",
        pertanyaan: "Perhatikan dua kondisi berikut.\nKondisi 1: Data berjumlah sedikit dan belum terurut.\nKondisi 2: Data berjumlah sangat banyak dan sudah terurut.\nPasangan algoritma pencarian yang paling sesuai adalah ....",
        opsiA: "Binary search untuk kondisi 1 dan sequential search untuk kondisi 2",
        opsiB: "Sequential search untuk kondisi 1 dan binary search untuk kondisi 2",
        opsiC: "Bubble sort untuk kondisi 1 dan binary search untuk kondisi 2",
        opsiD: "Selection sort untuk kedua kondisi",
        opsiE: "Binary search untuk kedua kondisi",
        jawaban: "Sequential search untuk kondisi 1 dan binary search untuk kondisi 2", level: "high"
    },
    {
        id: "soal-111",
        pertanyaan: "Seorang siswa ingin mengurutkan data nilai:\n75, 60, 90, 65, 80\ndari nilai terkecil ke terbesar. Ia memilih algoritma yang mencari nilai terkecil kemudian menempatkannya di posisi pertama dan mengulangi proses tersebut. Algoritma yang digunakan adalah ....",
        opsiA: "Bubble sort", opsiB: "Selection sort", opsiC: "Binary search", opsiD: "Sequential search", opsiE: "Quick sort",
        jawaban: "Selection sort", level: "high"
    },
    {
        id: "soal-112",
        pertanyaan: "Sebuah perpustakaan memiliki ribuan buku dengan kode yang sudah tersusun secara berurutan. Petugas ingin menemukan buku dengan kode tertentu dengan cepat. Strategi yang paling tepat adalah ....",
        opsiA: "Memeriksa buku satu per satu tanpa memperhatikan urutan",
        opsiB: "Mengacak seluruh kode buku",
        opsiC: "Menggunakan binary search karena data sudah terurut",
        opsiD: "Menggunakan bubble sort sebelum setiap pencarian",
        opsiE: "Menggunakan sequential search dari awal hingga akhir",
        jawaban: "Menggunakan binary search karena data sudah terurut", level: "high"
    },
    {
        id: "soal-113",
        pertanyaan: "Seorang siswa menggunakan binary search untuk mencari nama pada daftar yang belum diurutkan, tetapi hasil pencariannya tidak tepat. Analisis yang paling tepat adalah ....",
        opsiA: "Binary search hanya dapat digunakan untuk angka",
        opsiB: "Binary search tidak membutuhkan data terurut",
        opsiC: "Data perlu diurutkan terlebih dahulu agar binary search dapat digunakan dengan benar",
        opsiD: "Binary search hanya dapat digunakan untuk data yang sedikit",
        opsiE: "Data harus diacak terlebih dahulu sebelum dicari",
        jawaban: "Data perlu diurutkan terlebih dahulu agar binary search dapat digunakan dengan benar", level: "high"
    },
    {
        id: "soal-114",
        pertanyaan: "Rina ingin membuat program untuk menentukan nilai tertinggi dari lima nilai ujian. Ia menyusun langkah dengan membandingkan nilai satu per satu sampai mendapatkan nilai terbesar. Tahapan berpikir komputasional yang paling terlihat adalah ....",
        opsiA: "Abstraksi", opsiB: "Algoritma", opsiC: "Pengenalan pola", opsiD: "Dekomposisi", opsiE: "Evaluasi",
        jawaban: "Algoritma", level: "high"
    },
    {
        id: "soal-115",
        pertanyaan: "Seorang siswa memilih bubble sort untuk mengurutkan data karena jumlah datanya sedikit dan ia membutuhkan algoritma yang sederhana untuk dipahami. Keputusan tersebut menunjukkan bahwa ....",
        opsiA: "Semua masalah harus menggunakan bubble sort",
        opsiB: "Pemilihan algoritma harus disesuaikan dengan kondisi dan kebutuhan masalah",
        opsiC: "Algoritma yang rumit selalu lebih baik",
        opsiD: "Binary search harus digunakan untuk semua data",
        opsiE: "Algoritma tidak berpengaruh pada kecepatan eksekusi",
        jawaban: "Pemilihan algoritma harus disesuaikan dengan kondisi dan kebutuhan masalah", level: "high"
    },
    {
        id: "soal-116",
        pertanyaan: "Sebuah sistem perpustakaan harus dapat mencari buku berdasarkan judul dan menyusun daftar buku berdasarkan urutan abjad. Algoritma yang diperlukan adalah ....",
        opsiA: "Hanya searching", opsiB: "Hanya sorting", opsiC: "Searching dan sorting", opsiD: "Hanya flowchart", opsiE: "Hanya pseudocode",
        jawaban: "Searching dan sorting", level: "high"
    },
    {
        id: "soal-117",
        pertanyaan: "Perhatikan langkah berikut:\n1. Membagi masalah menjadi beberapa bagian.\n2. Menemukan pola dari bagian-bagian tersebut.\n3. Memilih informasi yang penting.\n4. Menyusun langkah penyelesaian.\nUrutan tahapan berpikir komputasional yang tepat adalah ....",
        opsiA: "Abstraksi → dekomposisi → pengenalan pola → algoritma",
        opsiB: "Dekomposisi → pengenalan pola → abstraksi → algoritma",
        opsiC: "Algoritma → abstraksi → pengenalan pola → dekomposisi",
        opsiD: "Pengenalan pola → algoritma → abstraksi → dekomposisi",
        opsiE: "Dekomposisi → abstraksi → pengenalan pola → algoritma",
        jawaban: "Dekomposisi → pengenalan pola → abstraksi → algoritma", level: "high"
    },

    // --- SOAL LEVEL MIDDLE ---
    {
        id: "soal-098",
        pertanyaan: "Seorang siswa mendapat tugas membuat acara kelas. Ia membagi tugas menjadi menentukan tempat, waktu, perlengkapan, konsumsi, dan susunan acara. Konsep berpikir komputasional yang diterapkan adalah ....",
        opsiA: "Abstraksi", opsiB: "Dekomposisi", opsiC: "Pengenalan pola", opsiD: "Sorting", opsiE: "Algorithm",
        jawaban: "Dekomposisi", level: "middle"
    },
    {
        id: "soal-099",
        pertanyaan: "Perhatikan data berikut:\n70, 80, 70, 90, 80, 70\nSeorang siswa menyadari bahwa nilai 70 muncul paling banyak. Kegiatan tersebut merupakan contoh ....",
        opsiA: "Algoritma", opsiB: "Abstraksi", opsiC: "Pengenalan pola", opsiD: "Dekomposisi", opsiE: "Searching",
        jawaban: "Pengenalan pola", level: "middle"
    },
    {
        id: "soal-100",
        pertanyaan: "Ketika mencari rute tercepat menuju sekolah, seorang siswa hanya memperhatikan jarak, kondisi jalan, dan kepadatan lalu lintas serta mengabaikan warna rumah yang dilewati. Hal tersebut merupakan penerapan ....",
        opsiA: "Algoritma", opsiB: "Abstraksi", opsiC: "Sorting", opsiD: "Searching", opsiE: "Dekomposisi",
        jawaban: "Abstraksi", level: "middle"
    },
    {
        id: "soal-101",
        pertanyaan: "Perhatikan data berikut:\n25, 40, 15, 60, 30\nJika menggunakan sequential search untuk mencari angka 60, urutan pemeriksaannya adalah ....",
        opsiA: "25 → 15 → 30 → 60", opsiB: "60 → 30 → 15 → 40", opsiC: "25 → 40 → 15 → 60", opsiD: "30 → 60", opsiE: "25 → 30 → 60",
        jawaban: "25 → 40 → 15 → 60", level: "middle"
    },
    {
        id: "soal-102",
        pertanyaan: "Perhatikan data yang sudah terurut berikut:\n10, 20, 30, 40, 50, 60, 70\nJika data tersebut dicari menggunakan binary search, data yang pertama kali diperiksa adalah ....",
        opsiA: "10", opsiB: "20", opsiC: "40", opsiD: "70", opsiE: "50",
        jawaban: "40", level: "middle"
    },
    {
        id: "soal-103",
        pertanyaan: "Mengapa binary search harus menggunakan data yang sudah terurut?",
        opsiA: "Agar semua data dapat dihapus",
        opsiB: "Agar data dapat dibagi menjadi bagian yang tepat saat pencarian",
        opsiC: "Agar pencarian selalu dimulai dari data terakhir",
        opsiD: "Agar data berubah menjadi angka",
        opsiE: "Agar tidak memakan memori komputer",
        jawaban: "Agar data dapat dibagi menjadi bagian yang tepat saat pencarian", level: "middle"
    },
    {
        id: "soal-104",
        pertanyaan: "Perhatikan data berikut:\n30, 10, 20\nJika menggunakan bubble sort secara ascending, pasangan data pertama yang dibandingkan adalah ....",
        opsiA: "30 dan 10", opsiB: "10 dan 20", opsiC: "30 dan 20", opsiD: "20 dan 30", opsiE: "10 dan 30",
        jawaban: "30 dan 10", level: "middle"
    },
    {
        id: "soal-105",
        pertanyaan: "Pada selection sort, proses utama yang dilakukan adalah ....",
        opsiA: "Mencari data secara acak",
        opsiB: "Mencari nilai terkecil atau terbesar dan menempatkannya pada posisi yang sesuai",
        opsiC: "Membagi data menjadi dua tanpa membandingkan",
        opsiD: "Menghapus data yang tidak sesuai",
        opsiE: "Menggabungkan dua data yang belum terurut",
        jawaban: "Mencari nilai terkecil atau terbesar dan menempatkannya pada posisi yang sesuai", level: "middle"
    },
    {
        id: "soal-106",
        pertanyaan: "Algoritma insertion sort bekerja dengan cara ....",
        opsiA: "Membandingkan seluruh data sekaligus",
        opsiB: "Memasukkan data ke posisi yang tepat pada bagian yang sudah terurut",
        opsiC: "Mencari data dari bagian tengah",
        opsiD: "Menghapus data yang tidak sesuai",
        opsiE: "Mengocok seluruh elemen secara berulang",
        jawaban: "Memasukkan data ke posisi yang tepat pada bagian yang sudah terurut", level: "middle"
    },
    {
        id: "soal-107",
        pertanyaan: "Seorang siswa ingin menjelaskan proses menghitung luas persegi panjang menggunakan simbol dan arah panah agar alurnya mudah dipahami. Bentuk algoritma yang paling sesuai adalah ....",
        opsiA: "Flowchart", opsiB: "Sorting", opsiC: "Searching", opsiD: "Database", opsiE: "Pseudocode",
        jawaban: "Flowchart", level: "middle"
    },

    // --- SOAL LEVEL LOW ---
    {
        id: "soal-088",
        pertanyaan: "Cara berpikir yang digunakan untuk menyelesaikan masalah secara logis, sistematis, dan terstruktur disebut ....",
        opsiA: "Berpikir kreatif", opsiB: "Berpikir komputasional", opsiC: "Berpikir bebas", opsiD: "Berpikir spontan", opsiE: "Berpikir abstrak",
        jawaban: "Berpikir komputasional", level: "low"
    },
    {
        id: "soal-089",
        pertanyaan: "Tujuan utama melakukan dekomposisi adalah ....",
        opsiA: "Membuat masalah menjadi lebih kompleks", opsiB: "Menghilangkan semua informasi", opsiC: "Memecah masalah menjadi bagian yang lebih kecil", opsiD: "Mengurutkan data", opsiE: "Menyimpan data di server",
        jawaban: "Memecah masalah menjadi bagian yang lebih kecil", level: "low"
    },
    {
        id: "soal-090",
        pertanyaan: "Proses menemukan kesamaan atau keteraturan dalam suatu masalah disebut ....",
        opsiA: "Abstraksi", opsiB: "Algoritma", opsiC: "Dekomposisi", opsiD: "Pengenalan pola", opsiE: "Sorting",
        jawaban: "Pengenalan pola", level: "low"
    },
    {
        id: "soal-091",
        pertanyaan: "Proses memilih informasi yang penting dan mengabaikan informasi yang tidak diperlukan disebut ....",
        opsiA: "Abstraksi", opsiB: "Dekomposisi", opsiC: "Pencarian", opsiD: "Pengurutan", opsiE: "Pengenalan pola",
        jawaban: "Abstraksi", level: "low"
    },
    {
        id: "soal-092",
        pertanyaan: "Serangkaian langkah yang disusun secara sistematis untuk menyelesaikan suatu masalah disebut ....",
        opsiA: "Data", opsiB: "Algoritma", opsiC: "Pola", opsiD: "Abstraksi", opsiE: "Dekomposisi",
        jawaban: "Algoritma", level: "low"
    },
    {
        id: "soal-093",
        pertanyaan: "Berikut yang merupakan bentuk penyajikan algoritma adalah ....",
        opsiA: "Deskriptif, pseudocode, dan flowchart", opsiB: "Tabel, grafik, dan gambar", opsiC: "Teks, audio, dan video", opsiD: "Angka, huruf, dan simbol", opsiE: "Koding, kompilasi, dan instalasi",
        jawaban: "Deskriptif, pseudocode, dan flowchart", level: "low"
    },
    {
        id: "soal-094",
        pertanyaan: "Algoritma yang digunakan untuk menemukan data tertentu disebut ....",
        opsiA: "Sorting", opsiB: "Searching", opsiC: "Coding", opsiD: "Debugging", opsiE: "Parsing",
        jawaban: "Searching", level: "low"
    },
    {
        id: "soal-095",
        pertanyaan: "Algoritma sorting digunakan untuk ....",
        opsiA: "Menghapus data", opsiB: "Mencari data", opsiC: "Mengurutkan data", opsiD: "Menyimpan data", opsiE: "Menggandakan data",
        jawaban: "Mengurutkan data", level: "low"
    },
    {
        id: "soal-096",
        pertanyaan: "Bentuk penulisan algoritma yang menggunakan bahasa sehari-hari disebut ....",
        opsiA: "Flowchart", opsiB: "Pseudocode", opsiC: "Deskriptif", opsiD: "Program", opsiE: "Diagram Venn",
        jawaban: "Deskriptif", level: "low"
    },
    {
        id: "soal-097",
        pertanyaan: "Salah satu manfaat berpikir komputasional adalah ....",
        opsiA: "Membuat masalah menjadi lebih sulit", opsiB: "Membantu menyelesaikan masalah secara efektif dan efisien", opsiC: "Menghilangkan seluruh data", opsiD: "Membuat semua pekerjaan dilakukan komputer", opsiE: "Menghindari penggunaan teknologi",
        jawaban: "Membantu menyelesaikan masalah secara efektif dan efisien", level: "low"
    }
];

document.addEventListener('DOMContentLoaded', async function() {
    const levelDisplay = document.getElementById('levelDisplay');
    const teamDisplay = document.getElementById('teamDisplay');

    if (levelDisplay) levelDisplay.textContent = level.charAt(0).toUpperCase() + level.slice(1) + ' Level';
    if (teamDisplay) teamDisplay.textContent = `Team: ${team}`;
    
    try {
        await fetch('/api/start-team', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ team: parseInt(team) })
        });
    } catch (err) {
        console.warn('API /api/start-team tidak merespons.');
    }
    
    await loadQuestions();
    
    if (questions.length === 0) {
        document.getElementById('pertanyaan').textContent = 'Soal tidak ditemukan untuk level: ' + level;
        return;
    }
    
    displayQuestion();
    
    document.querySelectorAll('.opsi-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (!answered) {
                playQuizAudioOnAnswer();
                selectAnswer(this);
            }
        });
    });
    
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', nextQuestion);
    }
});

async function loadQuestions() {
    let rawQuestions = [];
    let apiResponded = false;
    
    try {
        const response = await fetch(`/api/soal?level=${level}&random=false`);
        if (response.ok) {
            apiResponded = true;
            const data = await response.json();
            if (Array.isArray(data)) {
                rawQuestions = data.filter(q => q.level === level);
            } else if (data.questions && Array.isArray(data.questions)) {
                rawQuestions = data.questions.filter(q => q.level === level);
            }
        }
    } catch (error) {
        console.warn('API /api/soal gagal, beralih membaca file JSON...');
    }

    if (!apiResponded && rawQuestions.length === 0) {
        const jsonPaths = ['/js/soal.json', '/data/soal.json', '/soal.json'];
        for (let path of jsonPaths) {
            try {
                const res = await fetch(path);
                if (res.ok) {
                    const jsonData = await res.json();
                    if (Array.isArray(jsonData)) {
                        rawQuestions = jsonData.filter(q => q.level === level);
                        if (rawQuestions.length > 0) break;
                    }
                }
            } catch (e) {
                // Lanjut ke path berikutnya
            }
        }
    }

    if (!apiResponded && rawQuestions.length === 0) {
        console.warn('Menggunakan data backup soal bawaan JS.');
        rawQuestions = backupQuestions.filter(q => q.level === level);
    }

    questions = shuffleArray([...rawQuestions]);
}

function displayQuestion() {
    if (currentQuestion >= questions.length) {
        showResults();
        return;
    }
    
    const question = questions[currentQuestion];
    if (!question) return;
    
    answered = false;
    currentAnswer = null;
    
    const totalSoal = questions.length;
    const percentage = ((currentQuestion + 1) / totalSoal) * 100;
    
    const progressFill = document.getElementById('progressFill');
    const questionCount = document.getElementById('questionCount');
    
    if (progressFill) progressFill.style.width = percentage + '%';
    if (questionCount) questionCount.textContent = (currentQuestion + 1) + '/' + totalSoal;
    
    document.getElementById('pertanyaan').textContent = question.pertanyaan || question.soal;
    
    // PEMETAAN 5 OPSI (A, B, C, D, E)
    const opsiMap = {
        'A': question.opsiA || (question.opsi ? question.opsi.A : ''),
        'B': question.opsiB || (question.opsi ? question.opsi.B : ''),
        'C': question.opsiC || (question.opsi ? question.opsi.C : ''),
        'D': question.opsiD || (question.opsi ? question.opsi.D : ''),
        'E': question.opsiE || (question.opsi ? question.opsi.E : '')
    };
    
    document.querySelectorAll('.opsi-btn').forEach(btn => {
        const letter = btn.getAttribute('data-opsi');
        btn.classList.remove('selected', 'correct', 'wrong', 'incorrect');
        btn.disabled = false;
        
        const opsiText = btn.querySelector('.opsi-text');
        if (opsiText) opsiText.textContent = opsiMap[letter] || '-';
        
        const targetJawaban = String(question.jawaban || '').trim().toLowerCase();
        const textOpsi = String(opsiMap[letter] || '').trim().toLowerCase();
        const letterOpsi = letter.toLowerCase();

        const isCorrect = (targetJawaban === textOpsi) || (targetJawaban === letterOpsi);
        btn.setAttribute('data-correct', isCorrect ? 'true' : 'false');
    });
    
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.style.display = 'none';
}

function selectAnswer(button) {
    answered = true;
    currentAnswer = button.getAttribute('data-opsi');
    const isCorrect = button.getAttribute('data-correct') === 'true';
    
    document.querySelectorAll('.opsi-btn').forEach(btn => {
        btn.disabled = true;
    });

    if (isCorrect) {
        button.classList.add('correct');
        score++;
        fetch("/api/skor", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({team: team})
        }).catch(err => console.error(err));
    } else {
        button.classList.add('wrong');
        document.querySelectorAll('.opsi-btn').forEach(btn => {
            if (btn.getAttribute('data-correct') === 'true') {
                btn.classList.add('correct');
            }
        });
    }
    
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.style.display = 'flex';
}

function nextQuestion() {
    currentQuestion++;
    displayQuestion();
}

function showResults() {
    stopQuizAudio();

    const soalContainer = document.getElementById('soalContainer');
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (soalContainer) soalContainer.style.display = 'none';
    if (resultsContainer) resultsContainer.style.display = 'block';
    
    const totalSoal = questions.length;
    const resultMessage = document.getElementById('resultMessage');
    if (resultMessage) resultMessage.textContent = `Skor Tim ${team}: ${score}/${totalSoal}`;
    
    fetch("/api/finish-game", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({team: parseInt(team)})
    }).catch(err => console.error('Error finishing game:', err));
}

window.addEventListener('beforeunload', () => {
    stopQuizAudio();
});