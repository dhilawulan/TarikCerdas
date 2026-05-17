const baseKategori = ['low', 'middle', 'high'];
let customKategoriList = JSON.parse(localStorage.getItem('customKategori')) || [];
let selectedKategori = 'low';

function getAllKategori() {
    return [...baseKategori, ...customKategoriList];
}

function capitalizeLabel(kategori) {
    return kategori.charAt(0).toUpperCase() + kategori.slice(1);
}

function renderTabs() {
    const tabsContainer = document.getElementById('kategoriTabs');
    tabsContainer.innerHTML = '';

    getAllKategori().forEach(kategori => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'kategori-tab' + (kategori === selectedKategori ? ' active' : '');
        button.textContent = kategori === kategori.toLowerCase() ? capitalizeLabel(kategori) : kategori;
        button.dataset.kategori = kategori;
        button.addEventListener('click', () => {
            selectedKategori = kategori;
            renderTabs();
            updateSelectedLabel();
        });
        tabsContainer.appendChild(button);
    });
}

function updateSelectedLabel() {
    const label = document.getElementById('selectedTabLabel');
    label.textContent = selectedKategori ? (selectedKategori === selectedKategori.toLowerCase() ? capitalizeLabel(selectedKategori) : selectedKategori) : 'Pilih Kategori';
}

function saveCategories() {
    localStorage.setItem('customKategori', JSON.stringify(customKategoriList));
}

function renderKategoriList() {
    const list = document.getElementById('categoryTagList');
    list.innerHTML = '';

    if (customKategoriList.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-message';
        empty.textContent = 'Belum ada kategori tambahan.';
        list.appendChild(empty);
        return;
    }

    customKategoriList.forEach(kategori => {
        const chip = document.createElement('div');
        chip.className = 'category-chip';
        chip.innerHTML = `<span>${kategori}</span><button type="button" class="remove-chip" data-kategori="${kategori}">✕</button>`;

        chip.addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-chip')) return;
            selectKategori(kategori);
        });

        chip.querySelector('.remove-chip').addEventListener('click', (event) => {
            event.stopPropagation();
            customKategoriList = customKategoriList.filter(k => k !== kategori);
            if (selectedKategori === kategori) {
                selectedKategori = 'low';
            }
            saveCategories();
            renderTabs();
            renderKategoriList();
            updateSelectedLabel();
        });
        list.appendChild(chip);
    });
}

function selectKategori(kategori) {
    selectedKategori = kategori;
    renderTabs();
    updateSelectedLabel();
}

function addCategory() {
    const input = document.getElementById('newCategoryInput');
    const name = input.value.trim();

    if (!name) {
        alert('Masukkan nama kategori baru...');
        return;
    }

    const existing = getAllKategori().find(k => k.toLowerCase() === name.toLowerCase());
    if (existing) {
        alert('Kategori ini sudah ada.');
        input.value = '';
        return;
    }

    customKategoriList.push(name);
    saveCategories();
    renderTabs();
    renderKategoriList();
    selectKategori(name);
    input.value = '';
}

function clearAllCategories() {
    if (!customKategoriList.length) return;
    if (!confirm('Hapus semua kategori tambahan?')) return;
    customKategoriList = [];
    saveCategories();
    selectedKategori = 'low';
    renderTabs();
    renderKategoriList();
    updateSelectedLabel();
}

document.addEventListener('DOMContentLoaded', () => {
    renderTabs();
    renderKategoriList();
    updateSelectedLabel();

    document.getElementById('addCategoryBtn').addEventListener('click', addCategory);
    document.getElementById('saveCategoriesBtn').addEventListener('click', () => {
        saveCategories();
        alert('Kategori disimpan.');
    });
    document.getElementById('clearCategoriesBtn').addEventListener('click', clearAllCategories);
    document.getElementById('focusInputBtn').addEventListener('click', () => {
        document.getElementById('newCategoryInput').focus();
    });
    document.getElementById('newCategoryInput').addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addCategory();
        }
    });
});
