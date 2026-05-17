const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Soal = sequelize.define('Soal', {
    pertanyaan: {
        type: DataTypes.STRING,
        allowNull: false
    },
    opsiA: DataTypes.STRING,
    opsiB: DataTypes.STRING,
    opsiC: DataTypes.STRING,
    opsiD: DataTypes.STRING,
    jawaban: DataTypes.STRING,
    level: DataTypes.STRING // low, middle, high
});

module.exports = Soal;