// backend/routes/auth.js - УПРОЩЕННАЯ ВЕРСИЯ
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Подключение к БД
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'Accounting',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    connectionTimeoutMillis: 2000
});

// Middleware для проверки аутентификации
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Требуется аутентификация' 
        });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'secret123', (err, decoded) => {
        if (err) {
            return res.status(403).json({ 
                error: 'Недействительный токен' 
            });
        }
        req.user = decoded;
        next();
    });
};

// Функция создания стандартных категорий для нового пользователя
async function createDefaultCategories(userId) {
    try {
        const defaultCategories = [
            'Продукты',
            'Транспорт',
            'Развлечения',
            'Здоровье',
            'Одежда',
            'Коммунальные услуги',
            'Образование',
            'Подарки',
            'Зарплата',
            'Фриланс',
            'Инвестиции'
        ];
        
        for (const categoryName of defaultCategories) {
            // Проверяем, существует ли категория
            const existsResult = await pool.query(
                'SELECT categoryID FROM Category WHERE categoryName = $1',
                [categoryName]
            );
            
            if (existsResult.rows.length === 0) {
                // Создаем категорию
                await pool.query(
                    'INSERT INTO Category (categoryName) VALUES ($1)',
                    [categoryName]
                );
            }
        }
        
        console.log('Стандартные категории созданы для пользователя ID:', userId);
    } catch (error) {
        console.error('Ошибка создания стандартных категорий:', error);
    }
}

// backend/routes/auth.js - ОБНОВЛЕННЫЕ ТРЕБОВАНИЯ
router.post('/register', async (req, res) => {
    try {
        const { login, password, firstName, lastName } = req.body;
        
        console.log('Регистрация пользователя:', { login, firstName, lastName });
        
        // === ВАЛИДАЦИЯ ВВОДА ===
        
        // 1. Проверка обязательных полей
        if (!login || !password) {
            return res.status(400).json({ 
                error: 'Логин и пароль обязательны для заполнения' 
            });
        }
        
        // 2. Проверка длины логина
        if (login.length < 3) {
            return res.status(400).json({ 
                error: 'Логин должен содержать минимум 3 символа' 
            });
        }
        
        // 3. Проверка формата логина (только латинские буквы и цифры)
        const loginRegex = /^[a-zA-Z0-9_]+$/;
        if (!loginRegex.test(login)) {
            return res.status(400).json({ 
                error: 'Логин может содержать только латинские буквы, цифры и подчеркивание' 
            });
        }
        
        // 4. Проверка длины пароля
        if (password.length < 8) {
            return res.status(400).json({ 
                error: 'Пароль должен содержать минимум 8 символов' 
            });
        }
        
        // Проверяем существующего пользователя
        const userExists = await pool.query(
            'SELECT * FROM "User" WHERE login = $1',
            [login.toLowerCase()]
        );
        
        if (userExists.rows.length > 0) {
            return res.status(400).json({ 
                error: 'Пользователь с таким логином уже существует' 
            });
        }
        
        // Хешируем пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Создаем пользователя
        const newUser = await pool.query(
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
        
        // Создаем начальные категории для пользователя
        await createDefaultCategories(newUser.rows[0].userid);
        
        console.log('Пользователь успешно зарегистрирован:', newUser.rows[0].login);
        
        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            token,
            user: {
                id: newUser.rows[0].userid,
                login: newUser.rows[0].login,
                firstName: newUser.rows[0].firstname,
                lastName: newUser.rows[0].lastname
            }
        });
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ 
            error: 'Ошибка сервера при регистрации',
            details: error.message 
        });
    }
});

// Вход
router.post('/login', async (req, res) => {
    try {
        const { login, password } = req.body;
        
        console.log('Вход пользователя:', { login });
        
        // Ищем пользователя
        const result = await pool.query(
            'SELECT * FROM "User" WHERE login = $1',
            [login]
        );
        
        if (result.rows.length === 0) {
            return res.status(400).json({ 
                error: 'Неверный логин или пароль' 
            });
        }
        
        const user = result.rows[0];
        
        // Проверяем пароль
        const validPassword = await bcrypt.compare(password, user.passwordhash);
        if (!validPassword) {
            return res.status(400).json({ 
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
        
        res.json({
            message: 'Вход выполнен успешно',
            token,
            user: {
                id: user.userid,
                login: user.login,
                firstName: user.firstname,
                lastName: user.lastname
            }
        });
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ 
            error: 'Ошибка сервера',
            details: error.message 
        });
    }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // Логирование выхода
    try {
      await pool.query('CALL log_logout($1)', [req.user.id]);;
    } catch (logError) {
      console.error('Ошибка логирования выхода:', logError);
    }

    res.json({
      success: true,
      message: 'Выход выполнен успешно'
    });

  } catch (error) {
    console.error('Ошибка при выходе:', error);
    res.status(500).json({
      error: 'Ошибка сервера',
      details: error.message
    });
  }
});

// Проверка токена
router.get('/verify', (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    console.log('Проверка токена, заголовок:', req.headers['authorization']);
    
    if (!token) {
        console.log('Токен не предоставлен');
        return res.status(401).json({ valid: false, error: 'Токен не предоставлен' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
        console.log('Токен валиден, пользователь:', decoded.login);
        res.json({ valid: true, user: decoded });
    } catch (error) {
        console.error('Ошибка проверки токена:', error.message);
        res.status(401).json({ valid: false, error: error.message });
    }
});

// Получение данных текущего пользователя
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(
            `SELECT userID, login, firstName, lastName, roleID
             FROM "User" 
             WHERE userID = $1`,
            [userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Пользователь не найден' 
            });
        }
        
        const user = result.rows[0];
        
        res.json({
            user: {
                id: user.userid,
                login: user.login,
                firstName: user.firstname || '',
                lastName: user.lastname || '',
                createdAt: user.createdat
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения данных пользователя:', error);
        res.status(500).json({ 
            error: 'Ошибка сервера',
            details: error.message 
        });
    }
});

// Обновление данных пользователя - PUT /api/auth/me
router.put('/me', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { firstName, lastName, email, phone, birthdate, currency } = req.body;
        
        console.log('Обновление данных пользователя ID:', userId, { firstName, lastName });
        
        // Валидация данных
        if (firstName && firstName.length < 2) {
            return res.status(400).json({ 
                error: 'Имя должно содержать минимум 2 символа' 
            });
        }
        
        // Обновляем данные пользователя
        const result = await pool.query(
            `UPDATE "User" 
             SET firstName = COALESCE($1, firstName),
                 lastName = COALESCE($2, lastName),
                 email = COALESCE($3, email),
                 phone = COALESCE($4, phone),
                 birthdate = COALESCE($5::date, birthdate),
                 currency = COALESCE($6, currency)
             WHERE userID = $7
             RETURNING userID, login, firstName, lastName, email, phone, birthdate, currency`,
            [firstName, lastName, email, phone, birthdate, currency, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Пользователь не найден' 
            });
        }
        
        // Обновляем токен с новыми данными
        const updatedUser = result.rows[0];
        const newToken = jwt.sign(
            {
                id: updatedUser.userid,
                login: updatedUser.login,
                firstName: updatedUser.firstname,
                lastName: updatedUser.lastname
            },
            process.env.JWT_SECRET || 'secret123',
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Данные успешно обновлены',
            token: newToken, // Отправляем новый токен
            user: {
                id: updatedUser.userid,
                login: updatedUser.login,
                firstName: updatedUser.firstname,
                lastName: updatedUser.lastname,
                email: updatedUser.email,
                phone: updatedUser.phone,
                birthdate: updatedUser.birthdate,
                currency: updatedUser.currency
            }
        });
        
    } catch (error) {
        console.error('Ошибка обновления данных пользователя:', error);
        res.status(500).json({ 
            error: 'Ошибка сервера',
            details: error.message 
        });
    }
});

module.exports = router;