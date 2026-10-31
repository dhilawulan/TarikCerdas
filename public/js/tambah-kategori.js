document.addEventListener('DOMContentLoaded', function() {
    const newCategoryInput = document.getElementById('newCategoryInput');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const categoryTagList = document.getElementById('categoryTagList');
    const saveCategoriesBtn = document.getElementById('saveCategoriesBtn');
    const clearCategoriesBtn = document.getElementById('clearCategoriesBtn');
    const selectedTabLabel = document.getElementById('selectedTabLabel');

    // 1. Ambil kategori kustom milik akun yang sedang login
    let savedCategories = [];

    // Fungsi untuk memperbarui tampilan daftar tag kategori
    function renderCategoryTags() {
        if (!categoryTagList) return;
        
        categoryTagList.innerHTML = '';
        if (savedCategories.length === 0) {
            if (selectedTabLabel) {
                selectedTabLabel.textContent = 'Belum ada kategori baru yang ditambahkan';
            }
            return;
        }

        if (selectedTabLabel) {
            selectedTabLabel.textContent = savedCategories.join(', ');
        }

        savedCategories.forEach((cat, index) => {
            const tag = document.createElement('span');
            tag.className = 'kategori-tag';
            tag.style.cssText = 'display: inline-flex; align-items: center; gap: 8px; background: var(--accent-button, #2ec4b6); color: white; padding: 6px 14px; border-radius: 20px; margin: 4px; font-size: 14px;';
            tag.innerHTML = `
                ${escapeHtml(cat)}
                <i class="fas fa-times" data-index="${index}" style="cursor: pointer;" title="Hapus kategori"></i>
            `;
            categoryTagList.appendChild(tag);
        });
    }

    // Escape string untuk mencegah XSS
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    fetch('/api/categories')
        .then(response => {
            if (!response.ok) throw new Error('Gagal mengambil kategori.');
            return response.json();
        })
        .then(categories => {
            savedCategories = categories
                .map(category => category.name)
                .filter(name => !['low', 'middle', 'high'].includes(name.toLowerCase()));
            renderCategoryTags();
        })
        .catch(error => {
            console.error('Gagal memuat kategori:', error);
            alert('Gagal memuat kategori. Silakan muat ulang halaman.');
        });

    // 2. Tambahkan kategori baru ke daftar temporary
    if (addCategoryBtn && newCategoryInput) {
        addCategoryBtn.addEventListener('click', function() {
            const catName = newCategoryInput.value.trim();
            if (catName !== '') {
                // Konversi ke lowercase untuk pencegahan duplikasi sensitif huruf
                const exists = savedCategories.some(c => c.toLowerCase() === catName.toLowerCase());
                if (!exists) {
                    savedCategories.push(catName);
                    newCategoryInput.value = '';
                    renderCategoryTags();
                } else {
                    alert('Kategori tersebut sudah ada!');
                }
            } else {
                alert('Silakan masukkan nama kategori terlebih dahulu!');
            }
        });

        // Jalankan saat menekan tombol Enter pada input
        newCategoryInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addCategoryBtn.click();
            }
        });
    }

    // 3. Hapus individu tag kategori
    if (categoryTagList) {
        categoryTagList.addEventListener('click', function(e) {
            if (e.target.classList.contains('fa-times')) {
                const index = e.target.getAttribute('data-index');
                if (index !== null) {
                    savedCategories.splice(index, 1);
                    renderCategoryTags();
                }
            }
        });
    }

    // 4. Hapus semua kategori baru
    if (clearCategoriesBtn) {
        clearCategoriesBtn.addEventListener('click', function() {
            if (confirm('Apakah Anda yakin ingin menghapus semua kategori tambahan?')) {
                savedCategories = [];
                renderCategoryTags();
            }
        });
    }

    // 5. SIMPAN DAN PINDAH OTOMATIS KE DASHBOARD
    if (saveCategoriesBtn) {
        saveCategoriesBtn.addEventListener('click', async function() {
            try {
                const response = await fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ categories: savedCategories })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Gagal menyimpan kategori.');
                alert('Kategori berhasil disimpan!');
                window.location.href = '/dashboard';
            } catch (error) {
                console.error('Gagal menyimpan kategori:', error);
                alert(error.message);
            }
        });
    }
});