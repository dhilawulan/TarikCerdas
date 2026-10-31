const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserContent = sequelize.define('UserContent', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  materials: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  questions: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  categories: {
    type: DataTypes.TEXT,
    allowNull: false
  }
});

module.exports = UserContent;
