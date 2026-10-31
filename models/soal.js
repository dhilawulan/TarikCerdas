const express = require('express');
const router = express.Router();
const Soal = require('../models/soal'); // Import model yang baru kamu buat

// GET /api/soal?level=low
router.get('/soal', async (req, res) => {
    try {
        const level = req.query.level || 'low';

        // Ambil data soal dari tabel database berdasarkan level
        const dataSoal = await Soal.findAll({
            where: { level: level }
        });

        res.json(dataSoal);
    } catch (error) {
        console.error('Gagal mengambil soal dari database:', error);
        res.status(500).json({ error: 'Gagal mengambil data soal dari database' });
    }
});

module.exports = router;