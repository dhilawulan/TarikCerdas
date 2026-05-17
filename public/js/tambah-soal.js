document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const level = params.get('level') || 'low';
    const selectedLevel = document.getElementById('selectedLevel');
    const backToKelola = document.getElementById('backToKelola');
    const tambahSoalForm = document.getElementById('tambahSoalForm');

    selectedLevel.value = level;
    backToKelola.href = `/kelola-soal?level=${encodeURIComponent(level)}`;

    // Handle form submission dengan AJAX untuk better UX
    tambahSoalForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(tambahSoalForm);
        const submitBtn = tambahSoalForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

            // Convert FormData to JSON
            const jsonData = {};
            for (let [key, value] of formData.entries()) {
                jsonData[key] = value;
            }

            const response = await fetch('/tambah-soal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(jsonData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Show success message
                const successMsg = document.createElement('div');
                successMsg.style.cssText = `
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: #d4edda;
                    color: #155724;
                    padding: 15px 20px;
                    border-radius: 4px;
                    border: 1px solid #c3e6cb;
                    z-index: 10000;
                    font-weight: 600;
                `;
                successMsg.textContent = '✓ Soal berhasil ditambahkan! Redirecting...';
                document.body.appendChild(successMsg);

                // Reset form
                tambahSoalForm.reset();
                selectedLevel.value = level;

                // Redirect ke kelola-soal setelah 1.5 detik
                setTimeout(() => {
                    window.location.href = `/kelola-soal?level=${encodeURIComponent(level)}`;
                }, 1500);
            } else {
                throw new Error(result.message || 'Gagal menambahkan soal');
            }
        } catch (err) {
            console.error(err);
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            alert('❌ ' + err.message);
        }
    });
});
