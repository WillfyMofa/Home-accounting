// routes/admin.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'Accounting',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

// Мидлвара для проверки прав администратора
const adminMiddleware = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        console.log(`🔍 Проверка прав админа для пользователя: ${userId}`);
        
        // Проверяем роль пользователя
        const result = await pool.query(
            'SELECT roleID FROM "User" WHERE userID = $1',
            [userId]
        );
        
        // Если нет столбца roleID, даем доступ по ID пользователя
        if (result.rows.length === 0) {
            console.log('❌ Пользователь не найден');
            return res.status(403).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }
        
        // Если есть roleID, проверяем значение
        // Если roleID нет в таблице, result.rows[0].roleid будет undefined
        // В этом случае даем доступ только пользователю с ID=1 (первый пользователь)
        if (result.rows[0].roleid === undefined) {
            // Если нет столбца roleID, проверяем ID пользователя
            // Обычно первый пользователь - администратор
            if (userId === 17) {
                console.log('✅ Пользователь является администратором (первый пользователь)');
                next();
            } else {
                console.log('⛔ Пользователь не является администратором');
                return res.status(403).json({ 
                    success: false, 
                    error: 'Требуются права администратора' 
                });
            }
        } else if (result.rows[0].roleid !== 2) {
            console.log('❌ Отказ: пользователь не является администратором');
            return res.status(403).json({ 
                success: false, 
                error: 'Требуются права администратора' 
            });
        } else {
            console.log('✅ Пользователь является администратором');
            next();
        }
        
    } catch (error) {
        console.error('❌ Ошибка проверки прав:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка проверки прав' 
        });
    }
};

// 1. ПОЛУЧЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
router.get('/users', adminMiddleware, async (req, res) => {
    try {
        console.log('👥 Запрос на получение списка пользователей');
        
        // Сначала проверим структуру таблицы
        const tableInfo = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'User' AND table_schema = 'public'
        `);
        
        console.log('📊 Структура таблицы User:', tableInfo.rows);
        
        // Проверяем есть ли столбец roleID
        const hasRoleId = tableInfo.rows.some(col => col.column_name === 'roleid');
        const hasCreatedAt = tableInfo.rows.some(col => col.column_name === 'created_at');
        
        // Формируем запрос в зависимости от структуры таблицы
        let query = 'SELECT userID as id, login, firstName, lastName';

        if (hasRoleId) {
            query += ', roleID as role';
        } else {
            query += ', 1 as role'; // По умолчанию все пользователи
        }

        // Убрали условие для created_at

        query += ' FROM "User" ORDER BY userID DESC';
        
        console.log('📝 SQL запрос:', query);
        
        const result = await pool.query(query);
        
        console.log(`✅ Найдено пользователей: ${result.rows.length}`);
        
        // Добавляем информацию о столбцах в ответ для отладки
        res.json({
            success: true,
            users: result.rows,
            tableStructure: {
                hasRoleId: hasRoleId,
                hasCreatedAt: hasCreatedAt,
                columns: tableInfo.rows
            }
        });
    } catch (error) {
        console.error('❌ Ошибка получения пользователей:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка получения списка пользователей',
            details: error.message 
        });
    }
});

// 2. ОБНОВЛЕНИЕ РОЛИ ПОЛЬЗОВАТЕЛЯ
router.put('/users/:id/role', adminMiddleware, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { role } = req.body;
        const adminId = req.user.id;
        
        console.log(`👑 Обновление роли пользователя ${userId} на ${role} (админ: ${adminId})`);
        
        // Проверяем существование столбца roleID
        const tableInfo = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'User' AND column_name = 'roleid'
        `);
        
        if (tableInfo.rows.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'В таблице нет столбца roleID. Сначала выполните SQL для добавления ролей.' 
            });
        }
        
        if (![1, 2].includes(role)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Некорректная роль (допустимо: 1 - пользователь, 2 - администратор)' 
            });
        }
        
        // Нельзя изменить свою роль
        if (userId === adminId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Нельзя изменить свою собственную роль' 
            });
        }
        
        // Проверяем существование пользователя
        const userCheck = await pool.query(
            'SELECT userID FROM "User" WHERE userID = $1',
            [userId]
        );
        
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }
        
        // Обновляем роль
        await pool.query(
            'UPDATE "User" SET roleID = $1 WHERE userID = $2',
            [role, userId]
        );
        
        console.log(`✅ Роль пользователя ${userId} обновлена на ${role}`);
        
        res.json({
            success: true,
            message: 'Роль пользователя успешно обновлена'
        });
    } catch (error) {
        console.error('❌ Ошибка обновления роли:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера',
            details: error.message 
        });
    }
});

// 3. УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ
router.delete('/users/:id', adminMiddleware, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const adminId = req.user.id;
        
        console.log(`🗑️ Удаление пользователя ${userId} (админ: ${adminId})`);
        
        // Нельзя удалить себя
        if (userId === adminId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Нельзя удалить свой собственный аккаунт' 
            });
        }
        
        // Проверяем существование пользователя
        const userCheck = await pool.query(
            'SELECT userID FROM "User" WHERE userID = $1',
            [userId]
        );
        
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }
        
        // Удаляем пользователя
        await pool.query('DELETE FROM "User" WHERE userID = $1', [userId]);
        
        console.log(`✅ Пользователь ${userId} удален`);
        
        res.json({
            success: true,
            message: 'Пользователь успешно удален'
        });
    } catch (error) {
        console.error('❌ Ошибка удаления пользователя:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера',
            details: error.message 
        });
    }
});

// 4. ПОЛУЧЕНИЕ КАТЕГОРИЙ
router.get('/categories', adminMiddleware, async (req, res) => {
    try {
        console.log('🏷️ Админ запрос: получение категорий');
        
        const result = await pool.query(`
            SELECT 
                categoryID as id,
                categoryName as name
            FROM Category 
            ORDER BY categoryName
        `);
        
        console.log(`✅ Найдено категорий: ${result.rows.length}`);
        
        res.json({
            success: true,
            categories: result.rows
        });
    } catch (error) {
        console.error('❌ Ошибка получения категорий:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка получения списка категорий' 
        });
    }
});

// 5. СОЗДАНИЕ КАТЕГОРИИ
router.post('/categories', adminMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        
        console.log(`➕ Создание категории: "${name}"`);
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: 'Название категории обязательно' 
            });
        }
        
        const result = await pool.query(
            'INSERT INTO Category (categoryName) VALUES ($1) RETURNING categoryID as id, categoryName as name',
            [name.trim()]
        );
        
        console.log(`✅ Категория создана: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
        
        res.status(201).json({
            success: true,
            category: result.rows[0],
            message: 'Категория успешно создана'
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ 
                success: false, 
                error: 'Категория с таким названием уже существует' 
            });
        }
        console.error('❌ Ошибка создания категории:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка создания категории' 
        });
    }
});

// 6. ОБНОВЛЕНИЕ КАТЕГОРИИ
router.put('/categories/:id', adminMiddleware, async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id);
        const { name } = req.body;
        
        console.log(`✏️ Обновление категории ${categoryId}`);
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: 'Название категории обязательно' 
            });
        }
        
        const result = await pool.query(
            'UPDATE Category SET categoryName = $1 WHERE categoryID = $2 RETURNING categoryID as id, categoryName as name',
            [name.trim(), categoryId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Категория не найдена' 
            });
        }
        
        console.log(`✅ Категория обновлена: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
        
        res.json({
            success: true,
            category: result.rows[0],
            message: 'Категория успешно обновлена'
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ 
                success: false, 
                error: 'Категория с таким названием уже существует' 
            });
        }
        console.error('❌ Ошибка обновления категории:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка обновления категории' 
        });
    }
});

// 7. УДАЛЕНИЕ КАТЕГОРИИ
router.delete('/categories/:id', adminMiddleware, async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id);
        
        console.log(`🗑️ Удаление категории ${categoryId}`);
        
        // Проверяем, используется ли категория
        const usageCheck = await pool.query(
            'SELECT COUNT(*) FROM StoryRecord WHERE category = $1',
            [categoryId]
        );
        
        if (parseInt(usageCheck.rows[0].count) > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Нельзя удалить категорию, которая используется в операциях' 
            });
        }
        
        const result = await pool.query(
            'DELETE FROM Category WHERE categoryID = $1 RETURNING categoryID as id',
            [categoryId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Категория не найдена' 
            });
        }
        
        console.log(`✅ Категория удалена: ID ${categoryId}`);
        
        res.json({
            success: true,
            message: 'Категория успешно удалена'
        });
    } catch (error) {
        console.error('❌ Ошибка удаления категории:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка удаления категории' 
        });
    }
});

// 8. ПОЛУЧЕНИЕ ЛОГОВ
router.get('/logs', adminMiddleware, async (req, res) => {
    try {
        const { userId, page = 1, limit = 50 } = req.query;
        
        console.log(`📋 Получение логов, фильтр по пользователю: ${userId || 'все'}`);
        
        // Проверяем существование таблицы AccountLogs
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'accountlogs'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            console.log('⚠️ Таблица AccountLogs не существует');
            return res.json({
                success: true,
                logs: [],
                total: 0,
                page: parseInt(page),
                totalPages: 0,
                message: 'Таблица логов не найдена'
            });
        }
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Получаем логи с учетом фильтрации
        let query = `
            SELECT 
                logId as id,
                logName as action,
                createdat as date,
                userLog as user_id,
                u.login as user_login
            FROM AccountLogs al
            LEFT JOIN "User" u ON al.userLog = u.userID
            WHERE 1=1
        `;
        const params = [];
        
        if (userId) {
            params.push(userId);
            query += ` AND userLog = $${params.length}`;
        }
        
        query += ` ORDER BY createdat DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        // Получаем общее количество
        const countQuery = userId 
            ? 'SELECT COUNT(*) FROM AccountLogs WHERE userLog = $1'
            : 'SELECT COUNT(*) FROM AccountLogs';
        
        const countParams = userId ? [userId] : [];
        const countResult = await pool.query(countQuery, countParams);
        
        console.log(`✅ Найдено логов: ${result.rows.length}`);
        
        res.json({
            success: true,
            logs: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            totalPages: Math.ceil(countResult.rows[0].count / limit)
        });
    } catch (error) {
        console.error('❌ Ошибка получения логов:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка получения логов',
            details: error.message 
        });
    }
});

module.exports = router;