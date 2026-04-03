const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const adminRoutes = require('./routes/admin');
const targetsRouter = require('./routes/targets');

const app = express();

// ==================== КОНФИГУРАЦИЯ ====================
console.log('\n' + '='.repeat(50));
console.log('🚀 ЗАПУСК СЕРВЕРА УЧЁТА ФИНАНСОВ');
console.log('='.repeat(50));

// Читаем .env файл
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log('✅ .env файл найден');
} else {
    console.log('⚠️  .env файл не найден, используем значения по умолчанию');
}

const PORT = process.env.PORT || 3000;
console.log(`📡 Порт сервера: ${PORT}`);

// ==================== НАСТРОЙКА CORS ====================
const corsOptions = {
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 
             'http://localhost:3000', 'http://localhost:8080',
             'http://localhost:63342', 'http://127.0.0.1:5501',
             'http://localhost:5501'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'Origin', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ==================== ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ ====================
console.log('\n🔌 Подключение к базе данных...');
console.log(`   База данных: ${process.env.DB_NAME || 'Accounting'}`);
console.log(`   Хост: ${process.env.DB_HOST || 'localhost'}`);
console.log(`   Порт: ${process.env.DB_PORT || 5432}`);
console.log(`   Пользователь: ${process.env.DB_USER || 'postgres'}`);

const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'Accounting',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
};

const pool = new Pool(poolConfig);

// Обработчики событий БД
pool.on('connect', () => {
    console.log('✅ Новое подключение к БД установлено');
});

pool.on('error', (err) => {
    console.error('❌ Ошибка подключения к БД:', err.message);
});

// ==================== MIDDLEWARE АУТЕНТИФИКАЦИИ ====================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        console.log('⚠️  Запрос без токена:', req.path);
        return res.status(401).json({ 
            success: false,
            error: 'Требуется аутентификация' 
        });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
        req.user = decoded;
        next();
    } catch (error) {
        console.error('❌ Недействительный токен:', error.message);
        return res.status(403).json({ 
            success: false,
            error: 'Недействительный токен' 
        });
    }
};

// ==================== МАРШРУТЫ ====================

// 1. ТЕСТ СЕРВЕРА
app.get('/api/test', (req, res) => {
    console.log('✅ Тестовый запрос получен');
    res.json({ 
        success: true, 
        message: 'Сервер учёта финансов работает!',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// 2. ТЕСТ БАЗЫ ДАННЫХ
app.get('/api/test-db', async (req, res) => {
    try {
        console.log('🔄 Тестирование подключения к БД...');
        
        let client;
        try {
            client = await pool.connect();
            const result = await client.query('SELECT NOW() as time');
            
            console.log('✅ Подключение к БД успешно');
            res.json({ 
                success: true,
                message: '✅ База данных подключена!',
                time: result.rows[0].time
            });
        } finally {
            if (client) client.release();
        }
    } catch (error) {
        console.error('❌ Ошибка подключения к БД:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка подключения к БД',
            details: error.message 
        });
    }
});

// 3. РЕГИСТРАЦИЯ
app.post('/api/auth/register', async (req, res) => {
    try {
        console.log('📝 Запрос на регистрацию');
        
        const { login, password, firstName, lastName } = req.body;
        
        // Валидация
        if (!login || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Логин и пароль обязательны' 
            });
        }
        
        console.log(`   Логин: ${login}`);
        console.log(`   Имя: ${firstName || 'не указано'}`);
        console.log(`   Фамилия: ${lastName || 'не указана'}`);
        
        let client;
        try {
            client = await pool.connect();
            
            // Проверяем существующего пользователя
            const userExists = await client.query(
                'SELECT * FROM "User" WHERE login = $1',
                [login.toLowerCase()]
            );
            
            if (userExists.rows.length > 0) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Пользователь с таким логином уже существует' 
                });
            }
            
            // Хешируем пароль
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            // Создаем пользователя
            const newUser = await client.query(
                `INSERT INTO "User" (login, passwordHash, firstName, lastName, roleID) 
                 VALUES ($1, $2, $3, $4, 1) 
                 RETURNING userID, login, firstName, lastName`,
                [
                    login.toLowerCase(),
                    hashedPassword, 
                    firstName || '', 
                    lastName || ''
                ]
            );
            
            // Создаем токен
            const token = jwt.sign(
                {
                    id: newUser.rows[0].userid,
                    login: newUser.rows[0].login,
                    firstName: newUser.rows[0].firstname,
                    lastName: newUser.rows[0].lastname
                },
                process.env.JWT_SECRET || 'secret123',
                { expiresIn: '7d' }
            );
            
            console.log(`✅ Пользователь зарегистрирован: ${login}`);
            
            res.status(201).json({
                success: true,
                message: 'Пользователь успешно зарегистрирован',
                token,
                user: {
                    id: newUser.rows[0].userid,
                    login: newUser.rows[0].login,
                    firstName: newUser.rows[0].firstname,
                    lastName: newUser.rows[0].lastname
                }
            });
            
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка регистрации:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера при регистрации',
            details: error.message 
        });
    }
});

// 4. ВХОД
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('🔐 Запрос на вход');
        
        const { login, password } = req.body;
        
        if (!login || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Логин и пароль обязательны' 
            });
        }
        
        console.log(`   Логин: ${login}`);
        
        let client;
        try {
            client = await pool.connect();
            
            // Ищем пользователя
            const result = await client.query(
                'SELECT * FROM "User" WHERE login = $1',
                [login]
            );
            
            if (result.rows.length === 0) {
                console.log(`❌ Пользователь не найден: ${login}`);
                return res.status(400).json({ 
                    success: false,
                    error: 'Неверный логин или пароль' 
                });
            }
            
            const user = result.rows[0];
            

            
            // Проверяем пароль
            const validPassword = await bcrypt.compare(password, user.passwordhash);
            if (!validPassword) {
                console.log(`❌ Неверный пароль для: ${login}`);
                return res.status(400).json({ 
                    success: false,
                    error: 'Неверный логин или пароль' 
                });
            }
            
            // Создаем токен
            const token = jwt.sign(
                {
                    id: user.userid,
                    login: user.login,
                    firstName: user.firstname,
                    lastName: user.lastname
                },
                process.env.JWT_SECRET || 'secret123',
                { expiresIn: '7d' }
            );
            
            console.log(`✅ Успешный вход: ${user.login} (ID: ${user.userid})`);
            
            res.json({
                success: true,
                message: 'Вход выполнен успешно',
                token,
                user: {
                    id: user.userid,
                    login: user.login,
                    firstName: user.firstname,
                    lastName: user.lastname
                }
            });
            
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка входа:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера',
            details: error.message 
        });
    }
});

// 5. ПРОВЕРКА ТОКЕНА
app.get('/api/auth/verify', (req, res) => {
    console.log('🔍 Проверка токена');
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        console.log('❌ Токен не предоставлен');
        return res.status(401).json({ 
            success: false,
            valid: false, 
            error: 'Токен не предоставлен' 
        });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
        console.log(`✅ Токен валиден, пользователь: ${decoded.login}`);
        
        res.json({ 
            success: true,
            valid: true, 
            user: decoded 
        });
    } catch (error) {
        console.error('❌ Ошибка проверки токена:', error.message);
        res.status(401).json({ 
            success: false,
            valid: false, 
            error: error.message 
        });
    }
});

// 6. ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`👤 Запрос данных пользователя ID: ${userId}`);
        
        let client;
        try {
            client = await pool.connect();
            
            const result = await client.query(
                `SELECT 
                    userID as "id", 
                    login, 
                    firstName as "firstName", 
                    lastName as "lastName",
                    roleID as "role"
                FROM "User" 
                WHERE userID = $1`,
                [userId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Пользователь не найден' 
                });
            }
            
            const userData = result.rows[0];
            
            // Добавляем поле currency по умолчанию
            userData.currency = 'RUB';
            
            console.log('✅ Отправляем данные пользователя:', userData);
            
            res.json({
                success: true,
                user: userData
            });
            
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения данных пользователя:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера',
            details: error.message 
        });
    }
});

// 7. ОБНОВЛЕНИЕ ПРОФИЛЯ (PUT)
app.put('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { firstName, lastName, currency } = req.body;
        
        console.log(`✏️  Обновление профиля пользователя ID: ${userId}`);
        console.log(`   Новые данные:`, { firstName, lastName, currency });
        
        // Валидация
        if (!firstName || firstName.trim().length < 2) {
            return res.status(400).json({ 
                success: false,
                error: 'Имя должно содержать минимум 2 символа' 
            });
        }
        
        let client;
        try {
            client = await pool.connect();
            
            // Обновляем только firstName и lastName (currency пока не храним в БД)
            const result = await client.query(
                `UPDATE "User" 
                 SET firstName = $1, 
                     lastName = $2
                 WHERE userID = $3 
                 RETURNING userID as id, login, firstName, lastName`,
                [firstName.trim(), (lastName || '').trim(), userId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Пользователь не найден' 
                });
            }
            
            const updatedUser = result.rows[0];
            
            // Добавляем currency в ответ (храним только в localStorage на клиенте)
            updatedUser.currency = currency || 'RUB';
            
            console.log(`✅ Профиль обновлен: ${updatedUser.firstName} ${updatedUser.lastName}`);
            
            res.json({
                success: true,
                message: 'Профиль успешно обновлен',
                user: updatedUser
            });
            
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка обновления профиля:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера',
            details: error.message 
        });
    }
});

// 7. ВЫХОД
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    try {
        console.log(`👋 Выход пользователя: ${req.user.login}`);
        res.json({
            success: true,
            message: 'Выход выполнен успешно'
        });
    } catch (error) {
        console.error('❌ Ошибка при выходе:', error.message);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера',
            details: error.message
        });
    }
});

// 8. ОПЕРАЦИИ
app.get('/api/operations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`📊 Запрос операций пользователя ID: ${userId}`);
        
        let client;
        try {
            client = await pool.connect();
            
            const result = await client.query(`
                SELECT 
                    sr.storyRecordID as id,
                    sr.isIncome,
                    sr.amount,
                    sr.operationDate,
                    sr.description,
                    c.categoryName,
                    c.categoryID
                FROM StoryRecord sr
                LEFT JOIN Category c ON sr.category = c.categoryID
                WHERE sr.userStory = $1
                ORDER BY sr.operationDate DESC
                LIMIT 50
            `, [userId]);
            
            console.log(`✅ Найдено операций: ${result.rows.length}`);
            
            res.json({
                success: true,
                operations: result.rows
            });
            
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения операций:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при получении операций',
            details: error.message 
        });
    }
});

// 9. ОБНОВИТЬ ТЕКУЩУЮ СУММУ ЦЕЛИ (БЕЗ АВТОМАТИЧЕСКОГО ЗАВЕРШЕНИЯ)
app.patch('/api/targets/:id/current-amount', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = req.params.id;
        const { currentAmount } = req.body;
        
        console.log(`💰 Обновление текущей суммы цели ID: ${targetId}`);
        console.log(`   Новая текущая сумма: ${currentAmount}`);
        
        // Валидация
        if (currentAmount === undefined || currentAmount < 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Текущая сумма должна быть неотрицательной' 
            });
        }
        
        let client;
        try {
            client = await pool.connect();
            
            // Проверяем существование цели и принадлежность пользователю
            const checkResult = await client.query(
                'SELECT * FROM Target WHERE targetID = $1 AND UserTarget = $2',
                [targetId, userId]
            );
            
            if (checkResult.rows.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Цель не найдена или у вас нет прав на ее изменение' 
                });
            }
            
            const target = checkResult.rows[0];
            
            // Проверяем, не выполнена ли цель
            if (target.iscompleted) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Невозможно изменить сумму завершенной цели' 
                });
            }
            
            // ИСПРАВЛЕНО: Обновляем ТОЛЬКО currentAmount, НЕ трогаем isCompleted!
            const result = await client.query(`
                UPDATE Target 
                SET currentAmount = $1
                -- Убираем автоматическое завершение: isCompleted = ($1 >= targetAmount)
                WHERE targetID = $2
                RETURNING 
                    targetID as id,
                    targetName as "targetName",
                    targetAmount as "targetAmount",
                    currentAmount as "currentAmount",
                    isCompleted as "isCompleted"
            `, [parseFloat(currentAmount), targetId]);
            
            const updatedTarget = result.rows[0];
            
            console.log(`✅ Текущая сумма обновлена: ${currentAmount}`);
            
            res.json({
                success: true,
                message: 'Текущая сумма цели обновлена',
                target: updatedTarget
            });
            
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка обновления текущей суммы:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при обновлении текущей суммы',
            details: error.message 
        });
    }
});

// 9. СОЗДАТЬ ОПЕРАЦИЮ
app.post('/api/operations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { isIncome, amount, operationDate, description, categoryId } = req.body;
        
        console.log(`➕ Создание операции пользователя ID: ${userId}`);
        console.log(`   Данные:`, { isIncome, amount, operationDate, description, categoryId });
        
        // Валидация
        if (isIncome === undefined || !amount || !operationDate) {
            return res.status(400).json({ 
                success: false,
                error: 'Не все обязательные поля заполнены' 
            });
        }
        
        let client;
        try {
            client = await pool.connect();
            
            const result = await client.query(
                `INSERT INTO StoryRecord 
                 (isIncome, amount, operationDate, description, category, userStory) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING storyRecordID`,
                [isIncome, amount, operationDate, description || '', categoryId || null, userId]
            );
            
            console.log(`✅ Операция создана, ID: ${result.rows[0].storyrecordid}`);
            
            res.status(201).json({
                success: true,
                message: 'Операция создана',
                id: result.rows[0].storyrecordid
            });
            
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка создания операции:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при создании операции',
            details: error.message 
        });
    }
});

// 10. КАТЕГОРИИ
app.get('/api/categories', async (req, res) => {
    try {
        console.log('📋 Запрос категорий');
        
        let client;
        try {
            client = await pool.connect();
            
            const result = await client.query(
                'SELECT * FROM Category ORDER BY categoryName'
            );
            
            console.log(`✅ Найдено категорий: ${result.rows.length}`);
            
            res.json({
                success: true,
                categories: result.rows
            });
            
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения категорий:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при получении категорий',
            details: error.message 
        });
    }
});


// 11. СМЕНА ПАРОЛЯ
app.put('/api/auth/change-password', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;
        
        console.log(`🔐 Запрос на смену пароля пользователя ID: ${userId}`);
        
        // Валидация
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                success: false,
                error: 'Текущий и новый пароль обязательны' 
            });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({ 
                success: false,
                error: 'Новый пароль должен содержать не менее 8 символов' 
            });
        }
        
        let client;
        try {
            client = await pool.connect();
            
            // Получаем текущий хеш пароля
            const result = await client.query(
                'SELECT passwordHash FROM "User" WHERE userID = $1',
                [userId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Пользователь не найден' 
                });
            }
            
            const currentHash = result.rows[0].passwordhash;
            
            // Проверяем текущий пароль
            const validPassword = await bcrypt.compare(currentPassword, currentHash);
            if (!validPassword) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Текущий пароль неверен' 
                });
            }
            
            // Хешируем новый пароль
            const salt = await bcrypt.genSalt(10);
            const newHashedPassword = await bcrypt.hash(newPassword, salt);
            
            // Обновляем пароль в базе
            await client.query(
                'UPDATE "User" SET passwordHash = $1 WHERE userID = $2',
                [newHashedPassword, userId]
            );
            
            console.log(`✅ Пароль пользователя ${userId} успешно изменен`);
            
            res.json({
                success: true,
                message: 'Пароль успешно изменен'
            });
            
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка смены пароля:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера',
            details: error.message 
        });
    }
});

// 11. СОЗДАТЬ ОПЕРАЦИЮ С КАТЕГОРИЕЙ
app.post('/api/operations-with-category', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { isIncome, amount, operationDate, description, categoryName } = req.body;
        
        console.log(`➕ Создание операции с категорией пользователя ID: ${userId}`);
        console.log(`   Данные:`, { isIncome, amount, operationDate, description, categoryName });
        
        // Валидация
        if (isIncome === undefined || !amount || !operationDate || !categoryName) {
            return res.status(400).json({ 
                success: false,
                error: 'Не все обязательные поля заполнены' 
            });
        }
        
        let client;
        try {
            client = await pool.connect();
            
            // Начинаем транзакцию
            await client.query('BEGIN');
            
            // 1. Проверяем существование категории
            const categoryCheck = await client.query(
                'SELECT categoryID FROM Category WHERE categoryName = $1',
                [categoryName.trim()]
            );
            
            let categoryId;
            
            if (categoryCheck.rows.length > 0) {
                // Категория существует
                categoryId = categoryCheck.rows[0].categoryid;
                console.log(`✅ Используем существующую категорию: ${categoryName} (ID: ${categoryId})`);
            } else {
                // Создаем новую категорию
                const newCategory = await client.query(
                    `INSERT INTO Category (categoryName, isIncome) 
                     VALUES ($1, $2) 
                     RETURNING categoryID`,
                    [categoryName.trim(), isIncome]
                );
                
                categoryId = newCategory.rows[0].categoryid;
                console.log(`✅ Создана новая категория: ${categoryName} (ID: ${categoryId})`);
            }
            
            // 2. Создаем операцию
            const operationResult = await client.query(
                `INSERT INTO StoryRecord 
                 (isIncome, amount, operationDate, description, category, userStory) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING storyRecordID`,
                [isIncome, amount, operationDate, description || '', categoryId, userId]
            );

            // 3. Автоматически распределяем часть суммы на цели (опционально)
            if (isIncome && amount > 0) {
                // Находим активные цели пользователя
                const userTargets = await client.query(
                    'SELECT targetID, targetName, targetAmount, currentAmount FROM Target WHERE UserTarget = $1 AND isCompleted = false',
                    [userId]
                );
                
                if (userTargets.rows.length > 0) {
                    // Например, 30% от дохода идет на цели
                    const amountForTargets = amount * 0.3;
                    const perTarget = amountForTargets / userTargets.rows.length;
                    
                    for (const target of userTargets.rows) {
                        const targetId = target.targetid;
                        const currentAmount = parseFloat(target.currentamount) || 0;
                        const targetAmount = parseFloat(target.targetamount);
                        const remainingNeeded = targetAmount - currentAmount;
                        
                        // Даем не больше, чем нужно
                        const amountToAdd = Math.min(perTarget, remainingNeeded);
                        
                        if (amountToAdd > 0) {
                            const newCurrentAmount = currentAmount + amountToAdd;
                            const isCompleted = newCurrentAmount >= targetAmount;
                            
                            await client.query(`
                                UPDATE Target 
                                SET currentAmount = $1,
                                    isCompleted = $2
                                WHERE targetID = $3
                            `, [newCurrentAmount, isCompleted, targetId]);
                            
                            console.log(`✅ На цель "${target.targetname}" добавлено: ${amountToAdd}`);
                        }
                    }
                }
            }
                        
            // Коммитим транзакцию
            await client.query('COMMIT');
            
            console.log(`✅ Операция создана, ID: ${operationResult.rows[0].storyrecordid}`);
            
            res.status(201).json({
                success: true,
                message: 'Операция создана',
                id: operationResult.rows[0].storyrecordid,
                categoryId: categoryId
            });
            
        } catch (error) {
            // Откатываем транзакцию в случае ошибки
            await client.query('ROLLBACK');
            throw error;
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка создания операции с категорией:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при создании операции',
            details: error.message 
        });
    }
});

// 12. ОБНОВИТЬ ОПЕРАЦИЮ
app.put('/api/operations/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const operationId = req.params.id;
        const { isIncome, amount, operationDate, description, categoryId } = req.body;
        
        console.log(`✏️ Обновление операции ID: ${operationId}, пользователь ID: ${userId}`);
        console.log(`   Данные:`, { isIncome, amount, operationDate, description, categoryId });
        
        // Валидация
        if (isIncome === undefined || !amount || !operationDate) {
            return res.status(400).json({ 
                success: false,
                error: 'Не все обязательные поля заполнены' 
            });
        }
        
        let client;
        try {
            client = await pool.connect();
            
            // Проверяем существование операции и принадлежность пользователю
            const checkResult = await client.query(
                'SELECT * FROM StoryRecord WHERE storyRecordID = $1 AND userStory = $2',
                [operationId, userId]
            );
            
            if (checkResult.rows.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Операция не найдена или у вас нет прав на ее редактирование' 
                });
            }
            
            // Обновляем операцию
            const result = await client.query(
                `UPDATE StoryRecord 
                 SET isIncome = $1, 
                     amount = $2, 
                     operationDate = $3, 
                     description = $4, 
                     category = $5
                 WHERE storyRecordID = $6 
                 RETURNING storyRecordID`,
                [isIncome, amount, operationDate, description || '', categoryId || null, operationId]
            );
            
            console.log(`✅ Операция обновлена: ${operationId}`);
            
            res.json({
                success: true,
                message: 'Операция успешно обновлена',
                id: result.rows[0].storyrecordid
            });
            
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка обновления операции:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при обновлении операции',
            details: error.message 
        });
    }
});

// 13. ОБНОВИТЬ ОПЕРАЦИЮ С КАТЕГОРИЕЙ
app.put('/api/operations/:id/with-category', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const operationId = req.params.id;
        const { isIncome, amount, operationDate, description, categoryName } = req.body;
        
        console.log(`✏️ Обновление операции с категорией ID: ${operationId}, пользователь ID: ${userId}`);
        console.log(`   Данные:`, { isIncome, amount, operationDate, description, categoryName });
        
        // Валидация
        if (isIncome === undefined || !amount || !operationDate || !categoryName) {
            return res.status(400).json({ 
                success: false,
                error: 'Не все обязательные поля заполнены' 
            });
        }
        
        let client;
        try {
            client = await pool.connect();
            
            // Начинаем транзакцию
            await client.query('BEGIN');
            
            // Проверяем существование операции и принадлежность пользователю
            const checkResult = await client.query(
                'SELECT * FROM StoryRecord WHERE storyRecordID = $1 AND userStory = $2',
                [operationId, userId]
            );
            
            if (checkResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ 
                    success: false,
                    error: 'Операция не найдена или у вас нет прав на ее редактирование' 
                });
            }
            
            // Проверяем существование категории
            const categoryCheck = await client.query(
                'SELECT categoryID FROM Category WHERE categoryName = $1',
                [categoryName.trim()]
            );
            
            let categoryId;
            
            if (categoryCheck.rows.length > 0) {
                // Категория существует
                categoryId = categoryCheck.rows[0].categoryid;
                console.log(`✅ Используем существующую категорию: ${categoryName} (ID: ${categoryId})`);
            } else {
                // Создаем новую категорию
                const newCategory = await client.query(
                    `INSERT INTO Category (categoryName, isIncome) 
                     VALUES ($1, $2) 
                     RETURNING categoryID`,
                    [categoryName.trim(), isIncome]
                );
                
                categoryId = newCategory.rows[0].categoryid;
                console.log(`✅ Создана новая категория: ${categoryName} (ID: ${categoryId})`);
            }
            
            // Обновляем операцию
            const result = await client.query(
                `UPDATE StoryRecord 
                 SET isIncome = $1, 
                     amount = $2, 
                     operationDate = $3, 
                     description = $4, 
                     category = $5
                 WHERE storyRecordID = $6 
                 RETURNING storyRecordID`,
                [isIncome, amount, operationDate, description || '', categoryId, operationId]
            );
            
            // Коммитим транзакцию
            await client.query('COMMIT');
            
            console.log(`✅ Операция обновлена: ${operationId}`);
            
            res.json({
                success: true,
                message: 'Операция успешно обновлена',
                id: result.rows[0].storyrecordid,
                categoryId: categoryId
            });
            
        } catch (error) {
            // Откатываем транзакцию в случае ошибки
            await client.query('ROLLBACK');
            throw error;
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка обновления операции с категорией:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при обновлении операции',
            details: error.message 
        });
    }
});

// 14. УДАЛИТЬ ОПЕРАЦИЮ
app.delete('/api/operations/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const operationId = req.params.id;
        
        console.log(`🗑️ Удаление операции ID: ${operationId}, пользователь ID: ${userId}`);
        
        let client;
        try {
            client = await pool.connect();
            
            // Проверяем существование операции и принадлежность пользователю
            const checkResult = await client.query(
                'SELECT * FROM StoryRecord WHERE storyRecordID = $1 AND userStory = $2',
                [operationId, userId]
            );
            
            if (checkResult.rows.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Операция не найдена или у вас нет прав на ее удаление' 
                });
            }
            
            // Удаляем операцию
            await client.query(
                'DELETE FROM StoryRecord WHERE storyRecordID = $1',
                [operationId]
            );
            
            console.log(`✅ Операция удалена: ${operationId}`);
            
            res.json({
                success: true,
                message: 'Операция успешно удалена'
            });
            
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка удаления операции:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при удалении операции',
            details: error.message 
        });
    }
});

// 15. ПРОВЕРИТЬ/СОЗДАТЬ КАТЕГОРИЮ (ИСПРАВЛЕННАЯ ВЕРСИЯ)
app.post('/api/categories/check-or-create', authenticateToken, async (req, res) => {
    try {
        const { categoryName } = req.body;
        
        console.log(`🔍 Проверка/создание категории: ${categoryName}`);
        
        if (!categoryName || categoryName.trim() === '') {
            return res.status(400).json({ 
                success: false,
                error: 'Название категории обязательно' 
            });
        }
        
        let client;
        try {
            client = await pool.connect();
            
            // Начинаем транзакцию
            await client.query('BEGIN');
            
            // Проверяем существование категории (регистронезависимо)
            const categoryCheck = await client.query(
                'SELECT categoryID FROM Category WHERE LOWER(categoryName) = LOWER($1)',
                [categoryName.trim()]
            );
            
            let categoryId;
            
            if (categoryCheck.rows.length > 0) {
                // Категория существует
                categoryId = categoryCheck.rows[0].categoryid;
                console.log(`✅ Категория существует: ${categoryName} (ID: ${categoryId})`);
            } else {
                // Создаем новую категорию (без поля isIncome)
                const newCategory = await client.query(
                    `INSERT INTO Category (categoryName) 
                     VALUES ($1) 
                     RETURNING categoryID`,
                    [categoryName.trim()]
                );
                
                categoryId = newCategory.rows[0].categoryid;
                console.log(`✅ Создана новая категория: ${categoryName} (ID: ${categoryId})`);
            }
            
            // Коммитим транзакцию
            await client.query('COMMIT');
            
            res.json({
                success: true,
                categoryId: categoryId,
                message: categoryCheck.rows.length > 0 ? 'Категория найдена' : 'Категория создана'
            });
            
        } catch (error) {
            // Откатываем транзакцию в случае ошибки
            await client.query('ROLLBACK');
            throw error;
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка проверки/создания категории:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при работе с категорией',
            details: error.message 
        });
    }
});

// 16. СОЗДАТЬ ОПЕРАЦИЮ С КАТЕГОРИЕЙ (ИСПРАВЛЕННАЯ ВЕРСИЯ)
app.post('/api/operations-with-category', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { isIncome, amount, operationDate, description, categoryName } = req.body;
        
        console.log(`➕ Создание операции с категорией пользователя ID: ${userId}`);
        console.log(`   Данные:`, { isIncome, amount, operationDate, description, categoryName });
        
        // Валидация
        if (isIncome === undefined || !amount || !operationDate || !categoryName) {
            return res.status(400).json({ 
                success: false,
                error: 'Не все обязательные поля заполнены' 
            });
        }
        
        let client;
        try {
            client = await pool.connect();
            
            // Начинаем транзакцию
            await client.query('BEGIN');
            
            // 1. Проверяем существование категории
            const categoryCheck = await client.query(
                'SELECT categoryID FROM Category WHERE LOWER(categoryName) = LOWER($1)',
                [categoryName.trim()]
            );
            
            let categoryId;
            
            if (categoryCheck.rows.length > 0) {
                // Категория существует
                categoryId = categoryCheck.rows[0].categoryid;
                console.log(`✅ Используем существующую категорию: ${categoryName} (ID: ${categoryId})`);
            } else {
                // Создаем новую категорию (без isIncome)
                const newCategory = await client.query(
                    `INSERT INTO Category (categoryName) 
                     VALUES ($1) 
                     RETURNING categoryID`,
                    [categoryName.trim()]
                );
                
                categoryId = newCategory.rows[0].categoryid;
                console.log(`✅ Создана новая категория: ${categoryName} (ID: ${categoryId})`);
            }
            
            // 2. Создаем операцию
            const operationResult = await client.query(
                `INSERT INTO StoryRecord 
                 (isIncome, amount, operationDate, description, category, userStory) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING storyRecordID`,
                [isIncome, amount, operationDate, description || '', categoryId, userId]
            );
            
            // Коммитим транзакцию
            await client.query('COMMIT');
            
            console.log(`✅ Операция создана, ID: ${operationResult.rows[0].storyrecordid}`);
            
            res.status(201).json({
                success: true,
                message: 'Операция создана',
                id: operationResult.rows[0].storyrecordid,
                categoryId: categoryId
            });
            
        } catch (error) {
            // Откатываем транзакцию в случае ошибки
            await client.query('ROLLBACK');
            throw error;
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка создания операции с категорией:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при создании операции',
            details: error.message 
        });
    }
});

// 17. ОБНОВИТЬ ОПЕРАЦИЮ С КАТЕГОРИЕЙ (ИСПРАВЛЕННАЯ ВЕРСИЯ)
app.put('/api/operations/:id/with-category', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const operationId = req.params.id;
        const { isIncome, amount, operationDate, description, categoryName } = req.body;
        
        console.log(`✏️ Обновление операции с категорией ID: ${operationId}, пользователь ID: ${userId}`);
        console.log(`   Данные:`, { isIncome, amount, operationDate, description, categoryName });
        
        // Валидация
        if (isIncome === undefined || !amount || !operationDate || !categoryName) {
            return res.status(400).json({ 
                success: false,
                error: 'Не все обязательные поля заполнены' 
            });
        }
        
        let client;
        try {
            client = await pool.connect();
            
            // Начинаем транзакцию
            await client.query('BEGIN');
            
            // Проверяем существование операции и принадлежность пользователю
            const checkResult = await client.query(
                'SELECT * FROM StoryRecord WHERE storyRecordID = $1 AND userStory = $2',
                [operationId, userId]
            );
            
            if (checkResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ 
                    success: false,
                    error: 'Операция не найдена или у вас нет прав на ее редактирование' 
                });
            }
            
            // Проверяем существование категории
            const categoryCheck = await client.query(
                'SELECT categoryID FROM Category WHERE LOWER(categoryName) = LOWER($1)',
                [categoryName.trim()]
            );
            
            let categoryId;
            
            if (categoryCheck.rows.length > 0) {
                // Категория существует
                categoryId = categoryCheck.rows[0].categoryid;
                console.log(`✅ Используем существующую категорию: ${categoryName} (ID: ${categoryId})`);
            } else {
                // Создаем новую категорию (без isIncome)
                const newCategory = await client.query(
                    `INSERT INTO Category (categoryName) 
                     VALUES ($1) 
                     RETURNING categoryID`,
                    [categoryName.trim()]
                );
                
                categoryId = newCategory.rows[0].categoryid;
                console.log(`✅ Создана новая категория: ${categoryName} (ID: ${categoryId})`);
            }
            
            // Обновляем операцию
            const result = await client.query(
                `UPDATE StoryRecord 
                 SET isIncome = $1, 
                     amount = $2, 
                     operationDate = $3, 
                     description = $4, 
                     category = $5
                 WHERE storyRecordID = $6 
                 RETURNING storyRecordID`,
                [isIncome, amount, operationDate, description || '', categoryId, operationId]
            );
            
            // Коммитим транзакцию
            await client.query('COMMIT');
            
            console.log(`✅ Операция обновлена: ${operationId}`);
            
            res.json({
                success: true,
                message: 'Операция успешно обновлена',
                id: result.rows[0].storyrecordid,
                categoryId: categoryId
            });
            
        } catch (error) {
            // Откатываем транзакцию в случае ошибки
            await client.query('ROLLBACK');
            throw error;
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка обновления операции с категорией:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при обновлении операции',
            details: error.message 
        });
    }
});

// 19. РАСЧИТАТЬ БАЛАНС ДЛЯ ЦЕЛИ
app.get('/api/targets/:id/balance', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = req.params.id;
        
        console.log(`💰 Расчет баланса для цели ID: ${targetId}, пользователь ID: ${userId}`);
        
        // Проверяем существование цели и принадлежность пользователю
        const targetCheck = await pool.query(
            'SELECT * FROM Target WHERE targetID = $1 AND UserTarget = $2',
            [targetId, userId]
        );
        
        if (targetCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Цель не найдена или у вас нет прав на нее' 
            });
        }
        
        // Это общая логика: доходы минус расходы
        const balanceResult = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN isIncome THEN amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN NOT isIncome THEN amount ELSE 0 END), 0) as total_expense
            FROM StoryRecord 
            WHERE userStory = $1
        `, [userId]);
        
        const totalIncome = parseFloat(balanceResult.rows[0].total_income) || 0;
        const totalExpense = parseFloat(balanceResult.rows[0].total_expense) || 0;
        const totalBalance = totalIncome - totalExpense;
        
        res.json({
            success: true,
            balance: {
                totalIncome: totalIncome,
                totalExpense: totalExpense,
                totalBalance: totalBalance
            },
            target: {
                id: targetCheck.rows[0].targetid,
                name: targetCheck.rows[0].targetname,
                targetAmount: parseFloat(targetCheck.rows[0].targetamount),
                currentAmount: parseFloat(targetCheck.rows[0].currentamount),
                remainingAmount: Math.max(0, parseFloat(targetCheck.rows[0].targetamount) - parseFloat(targetCheck.rows[0].currentamount))
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка расчета баланса:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при расчете баланса',
            details: error.message 
        });
    }
});

// 20. АВТОМАТИЧЕСКИЙ РАСЧЕТ ТЕКУЩЕЙ СУММЫ ЦЕЛИ
app.patch('/api/targets/:id/auto-calculate', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = req.params.id;
        
        console.log(`🧮 Авторасчет суммы для цели ID: ${targetId}`);
        
        let client;
        try {
            client = await pool.connect();
            await client.query('BEGIN');
            
            // 1. Проверяем цель
            const targetCheck = await client.query(
                'SELECT * FROM Target WHERE targetID = $1 AND UserTarget = $2 FOR UPDATE',
                [targetId, userId]
            );
            
            if (targetCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ 
                    success: false,
                    error: 'Цель не найдена или у вас нет прав на нее' 
                });
            }
            
            const target = targetCheck.rows[0];
            
            // 2. Рассчитываем доступный баланс пользователя
            const balanceResult = await client.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN isIncome THEN amount ELSE 0 END), 0) as total_income,
                    COALESCE(SUM(CASE WHEN NOT isIncome THEN amount ELSE 0 END), 0) as total_expense
                FROM StoryRecord 
                WHERE userStory = $1
            `, [userId]);
            
            const totalIncome = parseFloat(balanceResult.rows[0].total_income) || 0;
            const totalExpense = parseFloat(balanceResult.rows[0].total_expense) || 0;
            const totalBalance = totalIncome - totalExpense;
            
            let calculatedAmount = 0;
            
            // Вариант 1: Процент от свободных средств
            // const percentage = 0.3; // 30% свободных средств идут на эту цель
            // calculatedAmount = Math.max(0, totalBalance * percentage);
            
            // Вариант 2: Равномерное распределение по всем целям
            const activeTargetsResult = await client.query(
                'SELECT COUNT(*) as count FROM Target WHERE UserTarget = $1 AND isCompleted = false',
                [userId]
            );
            const activeTargetsCount = parseInt(activeTargetsResult.rows[0].count) || 1;
            
            // Распределяем поровну между активными целями
            if (activeTargetsCount > 0 && totalBalance > 0) {
                calculatedAmount = totalBalance / activeTargetsCount;
            }
            
            // Ограничиваем расчетную суммой, чтобы не превышать цель
            const targetAmount = parseFloat(target.targetamount);
            const currentAmount = parseFloat(target.currentamount) || 0;
            const remaining = targetAmount - currentAmount;
            
            if (calculatedAmount > remaining) {
                calculatedAmount = remaining;
            }
            
            // 4. Обновляем текущую сумму цели
            const newCurrentAmount = currentAmount + calculatedAmount;
            const isCompleted = newCurrentAmount >= targetAmount;
            
            await client.query(`
                UPDATE Target 
                SET currentAmount = $1,
                    isCompleted = $2
                WHERE targetID = $3
            `, [newCurrentAmount, isCompleted, targetId]);
            
            await client.query('COMMIT');
            
            console.log(`✅ Авторасчет выполнен: +${calculatedAmount.toFixed(2)} для цели ${targetId}`);
            
            res.json({
                success: true,
                message: 'Текущая сумма цели рассчитана автоматически',
                calculatedAmount: calculatedAmount,
                target: {
                    id: targetId,
                    currentAmount: newCurrentAmount,
                    isCompleted: isCompleted,
                    progress: targetAmount > 0 ? Math.min(100, (newCurrentAmount / targetAmount) * 100) : 0
                }
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка авторасчета:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при автоматическом расчете суммы цели',
            details: error.message 
        });
    }
});

// 21. РАСПРЕДЕЛИТЬ СРЕДСТВА МЕЖДУ ВСЕМИ ЦЕЛЯМИ
app.post('/api/targets/distribute-funds', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { distributionMethod = 'equal' } = req.body; // 'equal' или 'proportional'
        
        console.log(`📊 Распределение средств между целями пользователя ID: ${userId}`);
        
        let client;
        try {
            client = await pool.connect();
            await client.query('BEGIN');
            
            // 1. Получаем свободный баланс
            const balanceResult = await client.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN isIncome THEN amount ELSE 0 END), 0) as total_income,
                    COALESCE(SUM(CASE WHEN NOT isIncome THEN amount ELSE 0 END), 0) as total_expense
                FROM StoryRecord 
                WHERE userStory = $1
            `, [userId]);
            
            const totalIncome = parseFloat(balanceResult.rows[0].total_income) || 0;
            const totalExpense = parseFloat(balanceResult.rows[0].total_expense) || 0;
            const freeBalance = totalIncome - totalExpense;
            
            if (freeBalance <= 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    success: false,
                    error: 'Нет свободных средств для распределения' 
                });
            }
            
            // 2. Получаем активные цели
            const activeTargetsResult = await client.query(`
                SELECT 
                    targetID,
                    targetName,
                    targetAmount,
                    currentAmount,
                    (targetAmount - currentAmount) as remaining
                FROM Target 
                WHERE UserTarget = $1 AND isCompleted = false
                ORDER BY remaining DESC
            `, [userId]);
            
            const activeTargets = activeTargetsResult.rows;
            
            if (activeTargets.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    success: false,
                    error: 'Нет активных целей для распределения средств' 
                });
            }
            
            // 3. Распределяем средства
            let remainingBalance = freeBalance;
            const distributionResults = [];
            
            if (distributionMethod === 'equal') {
                // Равномерное распределение
                const perTarget = remainingBalance / activeTargets.length;
                
                for (const target of activeTargets) {
                    const targetId = target.targetid;
                    const currentAmount = parseFloat(target.currentamount) || 0;
                    const targetAmount = parseFloat(target.targetamount);
                    const remainingNeeded = targetAmount - currentAmount;
                    
                    // Даем не больше, чем нужно для цели
                    const amountToAdd = Math.min(perTarget, remainingNeeded, remainingBalance);
                    
                    if (amountToAdd > 0) {
                        const newCurrentAmount = currentAmount + amountToAdd;
                        const isCompleted = newCurrentAmount >= targetAmount;
                        
                        await client.query(`
                            UPDATE Target 
                            SET currentAmount = $1,
                                isCompleted = $2
                            WHERE targetID = $3
                        `, [newCurrentAmount, isCompleted, targetId]);
                        
                        distributionResults.push({
                            targetId: targetId,
                            targetName: target.targetname,
                            amountAdded: amountToAdd,
                            newCurrentAmount: newCurrentAmount,
                            isCompleted: isCompleted
                        });
                        
                        remainingBalance -= amountToAdd;
                    }
                }
            } else if (distributionMethod === 'proportional') {
                // Пропорциональное распределение по оставшейся сумме
                const totalRemaining = activeTargets.reduce((sum, target) => {
                    return sum + Math.max(0, parseFloat(target.targetamount) - (parseFloat(target.currentamount) || 0));
                }, 0);
                
                if (totalRemaining > 0) {
                    for (const target of activeTargets) {
                        const targetId = target.targetid;
                        const currentAmount = parseFloat(target.currentamount) || 0;
                        const targetAmount = parseFloat(target.targetamount);
                        const remainingNeeded = targetAmount - currentAmount;
                        
                        if (remainingNeeded > 0 && remainingBalance > 0) {
                            // Пропорция от общей оставшейся суммы
                            const proportion = remainingNeeded / totalRemaining;
                            const amountToAdd = Math.min(freeBalance * proportion, remainingNeeded, remainingBalance);
                            
                            if (amountToAdd > 0) {
                                const newCurrentAmount = currentAmount + amountToAdd;
                                const isCompleted = newCurrentAmount >= targetAmount;
                                
                                await client.query(`
                                    UPDATE Target 
                                    SET currentAmount = $1,
                                        isCompleted = $2
                                    WHERE targetID = $3
                                `, [newCurrentAmount, isCompleted, targetId]);
                                
                                distributionResults.push({
                                    targetId: targetId,
                                    targetName: target.targetname,
                                    amountAdded: amountToAdd,
                                    newCurrentAmount: newCurrentAmount,
                                    isCompleted: isCompleted
                                });
                                
                                remainingBalance -= amountToAdd;
                            }
                        }
                    }
                }
            }
            
            await client.query('COMMIT');
            
            console.log(`✅ Средства распределены: ${freeBalance} между ${activeTargets.length} целями`);
            
            res.json({
                success: true,
                message: 'Средства успешно распределены между целями',
                freeBalance: freeBalance,
                remainingBalance: remainingBalance,
                distributionResults: distributionResults,
                targetsUpdated: distributionResults.length
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка распределения средств:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при распределении средств',
            details: error.message 
        });
    }
});

app.use('/api/admin', authenticateToken, adminRoutes);

// ==================== API ДЛЯ ЦЕЛЕЙ ====================

// 1. ПОЛУЧИТЬ ВСЕ ЦЕЛИ ПОЛЬЗОВАТЕЛЯ
app.get('/api/targets', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`🎯 Запрос целей пользователя ID: ${userId}`);
        
        let client;
        try {
            client = await pool.connect();
            
            const result = await client.query(`
                SELECT 
                    targetID as id,
                    targetName as "targetName",
                    targetAmount as "targetAmount",
                    currentAmount as "currentAmount",
                    isCompleted as "isCompleted"
                FROM Target 
                WHERE UserTarget = $1
                ORDER BY 
                    isCompleted ASC,
                    targetID DESC
            `, [userId]);
            
            // Рассчитываем прогресс
            const targetsWithProgress = result.rows.map(target => {
                const targetAmount = parseFloat(target.targetAmount);
                const currentAmount = parseFloat(target.currentAmount);
                const progress = targetAmount > 0 
                    ? Math.min(100, (currentAmount / targetAmount) * 100) 
                    : 0;
                
                return {
                    ...target,
                    progress: Math.round(progress * 100) / 100,
                    remainingAmount: Math.round((targetAmount - currentAmount) * 100) / 100
                };
            });
            
            console.log(`✅ Найдено целей: ${targetsWithProgress.length}`);
            
            res.json({
                success: true,
                targets: targetsWithProgress
            });
            
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения целей:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при получении целей',
            details: error.message 
        });
    }
});

// 2. СОЗДАТЬ НОВУЮ ЦЕЛЬ (с автоматическим расчетом текущей суммы)
app.post('/api/targets', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { targetName, targetAmount } = req.body;
        
        console.log(`🎯 Создание цели пользователя ID: ${userId}`);
        console.log(`   Данные:`, { targetName, targetAmount });
        
        // Валидация
        if (!targetName || !targetAmount) {
            return res.status(400).json({ 
                success: false,
                error: 'Название и сумма цели обязательны' 
            });
        }
        
        if (parseFloat(targetAmount) <= 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Сумма цели должна быть больше 0' 
            });
        }
        
        let client;
        try {
            client = await pool.connect();
            
            // ДОБАВЛЯЕМ: Рассчитываем текущий баланс пользователя
            const balanceResult = await client.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN isIncome THEN amount ELSE 0 END), 0) as total_income,
                    COALESCE(SUM(CASE WHEN NOT isIncome THEN amount ELSE 0 END), 0) as total_expense
                FROM StoryRecord 
                WHERE userStory = $1
            `, [userId]);
            
            const totalIncome = parseFloat(balanceResult.rows[0].total_income) || 0;
            const totalExpense = parseFloat(balanceResult.rows[0].total_expense) || 0;
            const currentBalance = totalIncome - totalExpense;
            
            // Текущая сумма цели = текущий баланс (но не больше целевой суммы)
            const initialCurrentAmount = Math.min(currentBalance, parseFloat(targetAmount));
            
            console.log(`💰 Текущий баланс пользователя: ${currentBalance} ₽`);
            console.log(`💰 Начальная сумма цели: ${initialCurrentAmount} ₽`);
            
            // Создаем цель с рассчитанной текущей суммой
            const result = await client.query(`
                INSERT INTO Target (targetName, targetAmount, currentAmount, UserTarget, isCompleted) 
                VALUES ($1, $2, $3, $4, false) 
                RETURNING 
                    targetID as id,
                    targetName as "targetName",
                    targetAmount as "targetAmount",
                    currentAmount as "currentAmount",
                    isCompleted as "isCompleted"
            `, [
                targetName.trim(),
                parseFloat(targetAmount),
                initialCurrentAmount,  // Используем рассчитанную сумму
                userId
            ]);
            
            const newTarget = result.rows[0];
            
            console.log(`✅ Цель создана, ID: ${newTarget.id}, текущая сумма: ${newTarget.currentAmount}`);
            
            res.status(201).json({
                success: true,
                message: 'Цель успешно создана',
                target: newTarget,
                balance: {
                    totalIncome: totalIncome,
                    totalExpense: totalExpense,
                    currentBalance: currentBalance
                }
            });
            
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка создания цели:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при создании цели',
            details: error.message 
        });
    }
});

// 3. ОБНОВИТЬ ЦЕЛЬ
app.put('/api/targets/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = req.params.id;
        const { targetName, targetAmount } = req.body;
        
        console.log(`✏️ Обновление цели ID: ${targetId}, пользователь ID: ${userId}`);
        console.log(`   Данные:`, { targetName, targetAmount });
        
        // Валидация
        if (!targetName || !targetAmount) {
            return res.status(400).json({ 
                success: false,
                error: 'Название и сумма цели обязательны' 
            });
        }
        
        if (parseFloat(targetAmount) <= 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Сумма цели должна быть больше 0' 
            });
        }
        
        let client;
        try {
            client = await pool.connect();
            
            // Проверяем существование цели и принадлежность пользователю
            const checkResult = await client.query(
                'SELECT * FROM Target WHERE targetID = $1 AND UserTarget = $2',
                [targetId, userId]
            );
            
            if (checkResult.rows.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Цель не найдена или у вас нет прав на ее редактирование' 
                });
            }
            
            // Обновляем цель
            const result = await client.query(`
                UPDATE Target 
                SET targetName = $1, 
                    targetAmount = $2
                WHERE targetID = $3 
                RETURNING 
                    targetID as id,
                    targetName as "targetName",
                    targetAmount as "targetAmount",
                    currentAmount as "currentAmount",
                    isCompleted as "isCompleted"
            `, [
                targetName.trim(),
                parseFloat(targetAmount),
                targetId
            ]);
            
            const updatedTarget = result.rows[0];
            
            // Рассчитываем прогресс
            const progress = updatedTarget.targetAmount > 0 
                ? Math.min(100, (updatedTarget.currentAmount / updatedTarget.targetAmount) * 100) 
                : 0;
            
            updatedTarget.progress = Math.round(progress * 100) / 100;
            updatedTarget.remainingAmount = Math.round((updatedTarget.targetAmount - updatedTarget.currentAmount) * 100) / 100;
            
            console.log(`✅ Цель обновлена: ${targetId}`);
            
            res.json({
                success: true,
                message: 'Цель успешно обновлена',
                target: updatedTarget
            });
            
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка обновления цели:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при обновлении цели',
            details: error.message 
        });
    }
});

// 4. УДАЛИТЬ ЦЕЛЬ
app.delete('/api/targets/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = req.params.id;
        
        console.log(`🗑️ Удаление цели ID: ${targetId}, пользователь ID: ${userId}`);
        
        let client;
        try {
            client = await pool.connect();
            
            // Проверяем существование цели и принадлежность пользователю
            const checkResult = await client.query(
                'SELECT * FROM Target WHERE targetID = $1 AND UserTarget = $2',
                [targetId, userId]
            );
            
            if (checkResult.rows.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Цель не найдена или у вас нет прав на ее удаление' 
                });
            }
            
            // Удаляем цель
            await client.query(
                'DELETE FROM Target WHERE targetID = $1',
                [targetId]
            );
            
            console.log(`✅ Цель удалена: ${targetId}`);
            
            res.json({
                success: true,
                message: 'Цель успешно удалена'
            });
            
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка удаления цели:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при удалении цели',
            details: error.message 
        });
    }
});

// 5. ВНЕСТИ СРЕДСТВА В ЦЕЛЬ
app.patch('/api/targets/:id/add-funds', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = req.params.id;
        const { amount } = req.body;
        
        console.log(`💰 Внесение средств в цель ID: ${targetId}, сумма: ${amount}`);
        
        // Валидация
        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Сумма должна быть больше 0' 
            });
        }
        
        let client;
        try {
            client = await pool.connect();
            
            // Начинаем транзакцию
            await client.query('BEGIN');
            
            // Проверяем существование цели и принадлежность пользователю
            const targetResult = await client.query(`
                SELECT * FROM Target 
                WHERE targetID = $1 AND UserTarget = $2
                FOR UPDATE
            `, [targetId, userId]);
            
            if (targetResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ 
                    success: false,
                    error: 'Цель не найдена или у вас нет прав на изменение' 
                });
            }
            
            const target = targetResult.rows[0];
            
            // Проверяем, не выполнена ли уже цель
            if (target.iscompleted) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    success: false,
                    error: 'Цель уже выполнена, нельзя вносить средства' 
                });
            }
            
            const currentAmount = parseFloat(target.currentamount);
            const targetAmount = parseFloat(target.targetamount);
            const addAmount = parseFloat(amount);
            
            // Проверяем, не превысит ли внесение сумму цели
            const newAmount = currentAmount + addAmount;
            if (newAmount > targetAmount) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    success: false,
                    error: `Сумма превышает цель. Осталось до цели: ${(targetAmount - currentAmount).toFixed(2)}` 
                });
            }
            
            // Обновляем сумму
            const result = await client.query(`
                UPDATE Target 
                SET currentAmount = currentAmount + $1,
                    isCompleted = (currentAmount + $1) >= targetAmount
                WHERE targetID = $2
                RETURNING 
                    targetID as id,
                    targetName as "targetName",
                    targetAmount as "targetAmount",
                    currentAmount as "currentAmount",
                    isCompleted as "isCompleted"
            `, [addAmount, targetId]);
            
            const updatedTarget = result.rows[0];
            
            // Коммитим транзакцию
            await client.query('COMMIT');
            
            // Рассчитываем прогресс
            const progress = updatedTarget.targetAmount > 0 
                ? Math.min(100, (updatedTarget.currentAmount / updatedTarget.targetAmount) * 100) 
                : 0;
            
            updatedTarget.progress = Math.round(progress * 100) / 100;
            updatedTarget.remainingAmount = Math.round((updatedTarget.targetAmount - updatedTarget.currentAmount) * 100) / 100;
            
            console.log(`✅ Средства внесены: ${amount}, новая сумма: ${updatedTarget.currentAmount}`);
            
            res.json({
                success: true,
                message: 'Средства успешно внесены в цель',
                target: updatedTarget,
                addedAmount: addAmount
            });
            
        } catch (error) {
            // Откатываем транзакцию в случае ошибки
            await client.query('ROLLBACK');
            throw error;
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка внесения средств:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при внесении средств',
            details: error.message 
        });
    }
});

// 6. ОТМЕТИТЬ ЦЕЛЬ КАК ВЫПОЛНЕННУЮ (с созданием операции расхода)
app.patch('/api/targets/:id/complete', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = req.params.id;
        
        console.log(`✅ Завершение цели ID: ${targetId}, пользователь ID: ${userId}`);
        
        let client;
        try {
            client = await pool.connect();
            
            // Начинаем транзакцию
            await client.query('BEGIN');
            
            // Проверяем существование цели и принадлежность пользователю
            const checkResult = await client.query(
                'SELECT * FROM Target WHERE targetID = $1 AND UserTarget = $2 FOR UPDATE',
                [targetId, userId]
            );
            
            if (checkResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ 
                    success: false,
                    error: 'Цель не найдена или у вас нет прав на изменение' 
                });
            }
            
            const target = checkResult.rows[0];
            
            // Проверяем, не выполнена ли уже цель
            if (target.iscompleted) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    success: false,
                    error: 'Цель уже выполнена' 
                });
            }
            
            // Проверяем, достигнута ли цель по сумме
            if (parseFloat(target.currentamount) < parseFloat(target.targetamount)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    success: false,
                    error: 'Цель не достигнута по сумме. Невозможно завершить.' 
                });
            }
            
            // Вызываем хранимую процедуру для завершения цели
            try {
                await client.query('CALL complete_target($1, $2)', [targetId, userId]);
            } catch (dbError) {
                await client.query('ROLLBACK');
                console.error('❌ Ошибка в процедуре complete_target:', dbError.message);
                return res.status(500).json({ 
                    success: false,
                    error: 'Ошибка при завершении цели: ' + dbError.message
                });
            }
            
            // Получаем обновленные данные цели
            const updatedResult = await client.query(`
                SELECT 
                    targetID as id,
                    targetName as "targetName",
                    targetAmount as "targetAmount",
                    currentAmount as "currentAmount",
                    isCompleted as "isCompleted"
                FROM Target 
                WHERE targetID = $1
            `, [targetId]);
            
            const completedTarget = updatedResult.rows[0];
            
            // Коммитим транзакцию
            await client.query('COMMIT');
            
            console.log(`✅ Цель выполнена: ${targetId}`);
            
            res.json({
                success: true,
                message: 'Цель успешно завершена. Создана операция расхода.',
                target: completedTarget
            });
            
        } catch (error) {
            // Откатываем транзакцию в случае ошибки
            await client.query('ROLLBACK');
            throw error;
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка завершения цели:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при завершении цели',
            details: error.message 
        });
    }
});

// 7. СБРОСИТЬ ВЫПОЛНЕНИЕ ЦЕЛИ
app.patch('/api/targets/:id/reset', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = req.params.id;
        
        console.log(`🔄 Сброс выполнения цели ID: ${targetId}`);
        
        let client;
        try {
            client = await pool.connect();
            
            // Проверяем существование цели и принадлежность пользователю
            const checkResult = await client.query(
                'SELECT * FROM Target WHERE targetID = $1 AND UserTarget = $2',
                [targetId, userId]
            );
            
            if (checkResult.rows.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Цель не найдена или у вас нет прав на изменение' 
                });
            }
            
            // Сбрасываем выполнение
            const result = await client.query(`
                UPDATE Target 
                SET isCompleted = false
                WHERE targetID = $1
                RETURNING 
                    targetID as id,
                    targetName as "targetName",
                    targetAmount as "targetAmount",
                    currentAmount as "currentAmount",
                    isCompleted as "isCompleted"
            `, [targetId]);
            
            const resetTarget = result.rows[0];
            
            console.log(`✅ Выполнение цели сброшено: ${targetId}`);
            
            res.json({
                success: true,
                message: 'Выполнение цели сброшено',
                target: resetTarget
            });
            
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка сброса выполнения цели:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при сбросе статуса цели',
            details: error.message 
        });
    }
});

// 8. ПОЛУЧИТЬ СТАТИСТИКУ ЦЕЛЕЙ
app.get('/api/targets/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`📊 Статистика целей пользователя ID: ${userId}`);
        
        let client;
        try {
            client = await pool.connect();
            
            // Общая статистика
            const statsResult = await client.query(`
                SELECT 
                    COUNT(*) as totalTargets,
                    SUM(CASE WHEN isCompleted THEN 1 ELSE 0 END) as completedTargets,
                    SUM(targetAmount) as totalTargetAmount,
                    SUM(currentAmount) as totalCurrentAmount,
                    SUM(CASE WHEN NOT isCompleted THEN targetAmount ELSE 0 END) as activeTargetAmount,
                    SUM(CASE WHEN NOT isCompleted THEN currentAmount ELSE 0 END) as activeCurrentAmount
                FROM Target 
                WHERE UserTarget = $1
            `, [userId]);
            
            const stats = statsResult.rows[0];
            
            // Расчет прогресса
            const totalProgress = stats.totaltargetamount > 0 
                ? (stats.totalcurrentamount / stats.totaltargetamount) * 100 
                : 0;
            
            const activeProgress = stats.activetargetamount > 0 
                ? (stats.activecurrentamount / stats.activetargetamount) * 100 
                : 0;
            
            const statsData = {
                total: {
                    count: parseInt(stats.totaltargets) || 0,
                    completed: parseInt(stats.completedtargets) || 0,
                    totalAmount: parseFloat(stats.totaltargetamount) || 0,
                    currentAmount: parseFloat(stats.totalcurrentamount) || 0,
                    progress: Math.round(totalProgress * 100) / 100
                },
                active: {
                    count: (parseInt(stats.totaltargets) || 0) - (parseInt(stats.completedtargets) || 0),
                    totalAmount: parseFloat(stats.activetargetamount) || 0,
                    currentAmount: parseFloat(stats.activecurrentamount) || 0,
                    progress: Math.round(activeProgress * 100) / 100,
                    remainingAmount: Math.round((parseFloat(stats.activetargetamount) - parseFloat(stats.activecurrentamount)) * 100) / 100
                }
            };
            
            console.log(`✅ Статистика получена`);
            
            res.json({
                success: true,
                stats: statsData
            });
            
        } finally {
            if (client) client.release();
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения статистики целей:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при получении статистики',
            details: error.message 
        });
    }
});

// ==================== СТАТИЧЕСКИЕ ФАЙЛЫ ====================
const frontendPath = path.join(__dirname, '../frontend');
console.log(`\n📁 Путь к фронтенду: ${frontendPath}`);

if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    
    // Маршрут для главной страницы
    app.get('*', (req, res) => {
        if (!req.url.startsWith('/api/')) {
            res.sendFile(path.join(frontendPath, 'login.html'));
        }
    });
    
    console.log('✅ Фронтенд найден, статические файлы подключены');
} else {
    console.log('⚠️  Фронтенд не найден, API будет работать без интерфейса');
}

// ==================== ОБРАБОТКА ОШИБОК ====================
app.use((err, req, res, next) => {
    console.error('❌ Необработанная ошибка:', err.message);
    res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера',
        message: err.message
    });
});

// ==================== ЗАПУСК СЕРВЕРА ====================
async function startServer() {
    try {
        console.log('\n🔌 Тестирование подключения к БД...');
        
        // Тестируем подключение к БД
        let client;
        try {
            client = await pool.connect();
            console.log('✅ Подключение к БД успешно');
            
            // Проверяем таблицы
            const tables = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            `);
            
            console.log(`📋 Таблицы в БД: ${tables.rows.map(r => r.table_name).join(', ')}`);
            
            // Проверяем пользователей
            const users = await client.query('SELECT COUNT(*) as count FROM "User"');
            console.log(`👥 Пользователей в системе: ${users.rows[0].count}`);
            
        } catch (dbError) {
            console.error('❌ Ошибка подключения к БД:', dbError.message);
            console.log('⚠️  Сервер будет работать в режиме без БД');
        } finally {
            if (client) client.release();
        }
        
        // Запускаем сервер
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log('\n' + '='.repeat(50));
            console.log(`🎉 СЕРВЕР ЗАПУЩЕН НА ПОРТУ ${PORT}!`);
            console.log('='.repeat(50));
            
            console.log('\n🌐 Доступные адреса:');
            console.log(`   http://localhost:${PORT}`);
            console.log(`   http://127.0.0.1:${PORT}`);
            
            // Показываем сетевые адреса
            const os = require('os');
            const interfaces = os.networkInterfaces();
            
            Object.keys(interfaces).forEach((iface) => {
                interfaces[iface].forEach((address) => {
                    if (address.family === 'IPv4' && !address.internal) {
                        console.log(`   http://${address.address}:${PORT}`);
                    }
                });
            });
            
            console.log('\n📡 Основные API маршруты:');
            console.log(`   GET    /api/test              - Проверка сервера`);
            console.log(`   GET    /api/test-db           - Проверка БД`);
            console.log(`   POST   /api/auth/register     - Регистрация`);
            console.log(`   POST   /api/auth/login        - Вход`);
            console.log(`   GET    /api/auth/me           - Данные пользователя`);
            console.log(`   GET    /api/operations        - Операции`);
            console.log(`   POST   /api/operations        - Создать операцию`);
            console.log(`   GET    /api/categories        - Категории`);
            console.log('='.repeat(50) + '\n');
        });
        
        // Обработка ошибок сервера
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Порт ${PORT} уже занят!`);
                console.log('Попробуйте:');
                console.log(`   lsof -i :${PORT}  # посмотреть процесс`);
                console.log(`   kill <PID>        # завершить процесс`);
                console.log(`   или измените порт в .env файле`);
            } else {
                console.error('❌ Ошибка сервера:', error.message);
            }
            process.exit(1);
        });
        
        // Обработка Ctrl+C
        process.on('SIGINT', () => {
            console.log('\n👋 Остановка сервера...');
            server.close(() => {
                console.log('✅ Сервер остановлен');
                pool.end();
                process.exit(0);
            });
        });
        
    } catch (error) {
        console.error('❌ Фатальная ошибка при запуске:', error.message);
        process.exit(1);
    }
}

app.use('/api/targets', targetsRouter);

startServer();

module.exports = { app, pool, authenticateToken };