const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
    console.log('=== ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ===');
    
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'Accounting',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || ''
    });
    
    try {
        // Читаем SQL файл
        const sqlPath = path.join(__dirname, 'database/Tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('Создаем таблицы...');
        await pool.query(sql);
        console.log('✅ Таблицы созданы успешно!');
        
        // Проверяем таблицы
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('\n=== СОЗДАННЫЕ ТАБЛИЦЫ ===');
        result.rows.forEach((row, i) => {
            console.log(`${i + 1}. ${row.table_name}`);
        });
        
        // Создаем тестового пользователя
        console.log('\n=== СОЗДАЕМ ТЕСТОВОГО ПОЛЬЗОВАТЕЛЯ ===');
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('test123', 10);
        
        await pool.query(`
            INSERT INTO "User" (login, passwordHash, firstName, lastName, email) 
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (login) DO NOTHING
        `, ['test', hashedPassword, 'Тест', 'Пользователь', 'test@example.com']);
        
        console.log('✅ Тестовый пользователь создан: login="test", password="test123"');
        
        // Создаем тестовые операции
        const userId = await pool.query('SELECT userID FROM "User" WHERE login = $1', ['test']);
        
        if (userId.rows.length > 0) {
            await pool.query(`
                INSERT INTO StoryRecord (isIncome, amount, operationDate, description, category, userStory)
                VALUES 
                (true, 50000, CURRENT_DATE - 30, 'Зарплата', 9, $1),
                (false, 2500, CURRENT_DATE - 25, 'Продукты', 1, $1),
                (false, 1200, CURRENT_DATE - 20, 'Транспорт', 2, $1),
                (false, 3000, CURRENT_DATE - 15, 'Ресторан', 12, $1),
                (true, 15000, CURRENT_DATE - 10, 'Фриланс', 10, $1)
            `, [userId.rows[0].userid]);
            
            console.log('✅ Тестовые операции добавлены');
        }
        
        console.log('\n=== ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА ===');
        console.log('База данных готова к использованию!');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации БД:', error.message);
        console.error('Детали:', error);
    } finally {
        await pool.end();
    }
}

// Запускаем инициализацию
initDatabase();