// backend/routes/operations.js - УПРОЩЕННАЯ ВЕРСИЯ
const express = require('express');
const router = express.Router();
const pool = require('../config/db').pool;

// Получить все операции
router.get('/', async (req, res) => {
    try {
        // Для теста берем операции первого пользователя
        const result = await pool.query(
            `SELECT sr.*, c.categoryName 
             FROM StoryRecord sr 
             LEFT JOIN Category c ON sr.category = c.categoryID 
             ORDER BY sr.operationDate DESC 
             LIMIT 50`
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении операций:', error);
        res.status(500).json({ error: 'Ошибка при получении операций' });
    }
});

// Получить категории
router.get('/categories', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM Category ORDER BY categoryName'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении категорий:', error);
        res.status(500).json({ error: 'Ошибка при получении категорий' });
    }
});

module.exports = router;