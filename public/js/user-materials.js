document.addEventListener('DOMContentLoaded', async () => {
    const level = window.gameLevel || 'low';
    const titleElements = [
        document.getElementById('title1'),
        document.getElementById('title2')
    ];
    const bodyElements = [
        document.getElementById('body1'),
        document.getElementById('body2')
    ];
    const editButton = document.querySelector('.btn-edit-materi');
    const materialForm = document.getElementById('materialForm');
    const categoryUrl = `/api/materi/${encodeURIComponent(level)}`;

    function renderCards(cards) {
        cards.forEach((card, index) => {
            if (titleElements[index]) titleElements[index].textContent = card.judul || '';
            if (bodyElements[index]) bodyElements[index].innerHTML = card.isi || '';
        });
    }

    try {
        const response = await fetch(categoryUrl);
        if (!response.ok) throw new Error('Gagal memuat materi kelas.');
        const data = await response.json();
        const cards = Array.isArray(data.cards)
            ? data.cards
            : [{ judul: data.judul || '', isi: data.isi || '' }, { judul: '', isi: '' }];
        renderCards(cards);

        const canEdit = Boolean(data.canEdit) && localStorage.getItem('userRole') !== 'siswa';
        if (editButton && !canEdit) {
            editButton.style.display = 'none';
        }
    } catch (error) {
        console.error('Gagal memuat materi kelas:', error);
        if (editButton) editButton.style.display = 'none';
    }

    if (!materialForm) return;

    materialForm.addEventListener('submit', async event => {
        event.preventDefault();
        const cards = [0, 1].map(index => ({
            judul: document.getElementById(`inputTitle${index + 1}`).value.trim(),
            isi: document.getElementById(`inputBody${index + 1}`).innerHTML
        }));

        try {
            const response = await fetch(categoryUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cards })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Gagal menyimpan materi.');
            renderCards(cards);
            closeEditMaterialModal();
        } catch (error) {
            console.error('Gagal menyimpan materi kelas:', error);
            alert(error.message);
        }
    });
});
