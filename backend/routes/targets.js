// backend/routes/targets.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'Accounting',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    connectionTimeoutMillis: 2000
});

// Middleware для проверки аутентификации
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }
    
    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET || 'secret123', (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: 'Недействительный токен' });
        }
        req.user = user;
        next();
    });
};

// ===== ПОЛУЧЕНИЕ ВСЕХ ЦЕЛЕЙ =====
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(`
            SELECT 
                targetID as id,
                targetName,
                targetAmount,
                currentAmount,
                isCompleted
            FROM Target
            WHERE userTarget = $1
            ORDER BY targetID DESC
        `, [userId]);
        
        const targets = result.rows.map(row => ({
            id: row.id,
            targetName: row.targetname,
            targetAmount: parseFloat(row.targetamount),
            currentAmount: parseFloat(row.currentamount),
            isCompleted: row.iscompleted
        }));
        
        res.json({ success: true, targets });
        
    } catch (error) {
        console.error('Ошибка получения целей:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== СОЗДАНИЕ ЦЕЛИ =====
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { targetName, targetAmount, currentAmount } = req.body;
        
        if (!targetName || !targetAmount) {
            return res.status(400).json({ success: false, error: 'Название и сумма обязательны' });
        }
        
        const result = await pool.query(`
            INSERT INTO Target (targetName, targetAmount, currentAmount, userTarget, isCompleted)
            VALUES ($1, $2, $3, $4, false)
            RETURNING targetID as id, targetName, targetAmount, currentAmount, isCompleted
        `, [targetName, targetAmount, currentAmount || 0, userId]);
        
        res.status(201).json({ success: true, target: result.rows[0] });
        
    } catch (error) {
        console.error('Ошибка создания цели:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== ОБНОВЛЕНИЕ ЦЕЛИ (только название и сумма) =====
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = parseInt(req.params.id);
        const { targetName, targetAmount } = req.body;
        
        // Проверяем, не завершена ли цель
        const checkResult = await pool.query(
            'SELECT isCompleted FROM Target WHERE targetID = $1 AND userTarget = $2',
            [targetId, userId]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Цель не найдена' });
        }
        
        if (checkResult.rows[0].iscompleted) {
            return res.status(400).json({ success: false, error: 'Нельзя редактировать завершенную цель' });
        }
        
        const result = await pool.query(`
            UPDATE Target 
            SET targetName = $1, targetAmount = $2
            WHERE targetID = $3 AND userTarget = $4
            RETURNING targetID as id, targetName, targetAmount, currentAmount, isCompleted
        `, [targetName, targetAmount, targetId, userId]);
        
        res.json({ success: true, target: result.rows[0] });
        
    } catch (error) {
        console.error('Ошибка обновления цели:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== ОБНОВЛЕНИЕ ТЕКУЩЕЙ СУММЫ (БЕЗ АВТОМАТИЧЕСКОГО ЗАВЕРШЕНИЯ) =====
router.patch('/:id/current-amount', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = parseInt(req.params.id);
        const { currentAmount } = req.body;
        
        // Проверяем, не завершена ли цель
        const checkResult = await pool.query(
            'SELECT isCompleted FROM Target WHERE targetID = $1 AND userTarget = $2',
            [targetId, userId]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Цель не найдена' });
        }
        
        if (checkResult.rows[0].iscompleted) {
            return res.status(400).json({ success: false, error: 'Нельзя обновлять завершенную цель' });
        }
        
        // ВАЖНО: обновляем только currentAmount, НЕ трогаем isCompleted!
        const result = await pool.query(`
            UPDATE Target 
            SET currentAmount = $1
            WHERE targetID = $2 AND userTarget = $3
            RETURNING targetID as id, targetName, targetAmount, currentAmount, isCompleted
        `, [currentAmount, targetId, userId]);
        
        res.json({ success: true, target: result.rows[0] });
        
    } catch (error) {
        console.error('Ошибка обновления текущей суммы:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== ЗАВЕРШЕНИЕ ЦЕЛИ (ТОЛЬКО ПО ЯВНОМУ ДЕЙСТВИЮ) =====
router.patch('/:id/complete', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = parseInt(req.params.id);
        
        // Получаем цель
        const targetResult = await pool.query(`
            SELECT targetName, targetAmount, currentAmount, isCompleted
            FROM Target 
            WHERE targetID = $1 AND userTarget = $2
        `, [targetId, userId]);
        
        if (targetResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Цель не найдена' });
        }
        
        const target = targetResult.rows[0];
        
        // Проверяем, не завершена ли уже
        if (target.iscompleted) {
            return res.status(400).json({ success: false, error: 'Цель уже завершена' });
        }
        
        // Проверяем, достигнута ли сумма
        if (parseFloat(target.currentamount) < parseFloat(target.targetamount)) {
            return res.status(400).json({ 
                success: false, 
                error: `Целевая сумма не достигнута. Текущая: ${target.currentamount}, Необходимо: ${target.targetamount}`
            });
        }
        
        // Завершаем цель
        const result = await pool.query(`
            UPDATE Target 
            SET isCompleted = true
            WHERE targetID = $1 AND userTarget = $2
            RETURNING targetID as id, targetName, targetAmount, currentAmount, isCompleted
        `, [targetId, userId]);
        
        res.json({ success: true, target: result.rows[0] });
        
    } catch (error) {
        console.error('Ошибка завершения цели:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== УДАЛЕНИЕ ЦЕЛИ =====
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = parseInt(req.params.id);
        
        const result = await pool.query(
            'DELETE FROM Target WHERE targetID = $1 AND userTarget = $2 RETURNING targetID',
            [targetId, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Цель не найдена' });
        }
        
        res.json({ success: true, message: 'Цель удалена' });
        
    } catch (error) {
        console.error('Ошибка удаления цели:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;