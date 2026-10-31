document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const level = params.get('level') || 'low';
    const selectedLevel = document.getElementById('selectedLevel');
    const backToKelola = document.getElementById('backToKelola');
    const tambahSoalForm = document.getElementById('tambahSoalForm');

    if (selectedLevel) {
        selectedLevel.value = level;
    }

    if (backToKelola) {
        backToKelola.href = `/kelola-soal?level=${encodeURIComponent(level)}`;
    }

    if (tambahSoalForm) {
        tambahSoalForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(tambahSoalForm);
            const submitBtn = tambahSoalForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

                // 1. Convert FormData ke Object
                const jsonData = {};
                for (let [key, value] of formData.entries()) {
                    jsonData[key] = typeof value === 'string' ? value.trim() : value;
                }

                // 2. Pastikan 'level' dan 'kategori' selalu ada
                jsonData.level = level;
                jsonData.kategori = jsonData.kategori || level;

                // 3. --- PERBAIKAN PEMETAAN KUNCI JAWABAN (A - E) ---
                const rawJawaban = String(jsonData.jawaban || '').trim().toUpperCase();

                // Pemetaan pilihan A, B, C, D, E ke teks opsi yang diinputkan
                const mapOpsi = {
                    'A': jsonData.opsiA,
                    'B': jsonData.opsiB,
                    'C': jsonData.opsiC,
                    'D': jsonData.opsiD,
                    'E': jsonData.opsiE
                };

                // Jika kunci jawaban berupa abjad (A/B/C/D/E), timpa nilainya dengan teks opsi
                if (mapOpsi[rawJawaban]) {
                    jsonData.jawaban = mapOpsi[rawJawaban];
                }

                // 4. Kirim request ke endpoint API
                const response = await fetch('/api/soal', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(jsonData)
                });

                // Fallback jika endpoint backend ada di '/tambah-soal'
                let result;
                if (!response.ok && response.status === 404) {
                    const fallbackResponse = await fetch('/tambah-soal', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(jsonData)
                    });
                    result = await fallbackResponse.json();
                } else {
                    result = await response.json();
                }

                // 5. Penanganan Response
                if (result.success || result.status === 'ok') {
                    const successMsg = document.createElement('div');
                    successMsg.style.cssText = `
                        position: fixed;
                        top: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        background-color: #1b4332;
                        color: #2ec4b6;
                        padding: 15px 25px;
                        border-radius: 8px;
                        border: 1px solid #2ec4b6;
                        z-index: 10000;
                        font-weight: 600;
                        box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                    `;
                    successMsg.textContent = '✓ Soal berhasil ditambahkan! Mengalihkan...';
                    document.body.appendChild(successMsg);

                    tambahSoalForm.reset();
                    if (selectedLevel) selectedLevel.value = level;

                    setTimeout(() => {
                        window.location.href = `/kelola-soal?level=${encodeURIComponent(level)}`;
                    }, 1000);
                } else {
                    throw new Error(result.message || 'Gagal menambahkan soal');
                }
            } catch (err) {
                console.error('Error adding question:', err);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                alert('❌ ' + err.message);
            }
        });
    }
});