INSERT INTO Category (categoryName) VALUES
    ('Зарплата'),
    ('Фриланс'),
    ('Инвестиции'),
    ('Подарки'),
    ('Продукты'),
    ('Транспорт'),
    ('ЖКХ'),
    ('Развлечения'),
    ('Одежда'),
    ('Кафе'),
    ('Медицина'),
    ('Образование')
ON CONFLICT (categoryName) DO NOTHING;

INSERT INTO "User" (login, passwordHash, firstName, lastName, roleID) VALUES
    ('alex', '$2a$10$N9qo8uLOickgx2ZMRZoMye8G7b4oF7YTUHOv.zp7Zf5U5Q2KQ5J6W', 'Алексей', 'Смирнов', 1),
    ('masha', '$2a$10$N9qo8uLOickgx2ZMRZoMye8G7b4oF7YTUHOv.zp7Zf5U5Q2KQ5J6W', 'Мария', 'Иванова', 1),
    ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye8G7b4oF7YTUHOv.zp7Zf5U5Q2KQ5J6W', 'Админ', 'Админов', 2)
ON CONFLICT (login) DO NOTHING;

INSERT INTO Target (targetName, targetAmount, userTarget) VALUES
    ('Новый ноутбук', 150000.00, 1),
    ('Поездка на море', 80000.00, 1),
    ('Накопления на чёрный день', 300000.00, 2),
    ('Новый автомобиль', 2000000.00, 2),
    ('Ремонт в квартире', 500000.00, 1),
    ('Обучение на курсах', 120000.00, 2)
ON CONFLICT DO NOTHING;

INSERT INTO StoryRecord (isIncome, amount, operationDate, category, userStory) VALUES
    (true, 85000.00, '2024-03-01', 1, 1),
    (true, 15000.00, '2024-03-10', 2, 1),
    (true, 87000.00, '2024-04-01', 1, 1),
    (true, 5000.00, '2024-04-15', 4, 1),
    
    (false, 12000.00, '2024-03-03', 5, 1),
    (false, 3000.00, '2024-03-05', 6, 1),
    (false, 8000.00, '2024-03-07', 7, 1),
    (false, 5000.00, '2024-03-12', 8, 1),
    (false, 10000.00, '2024-04-02', 9, 1),
    (false, 2500.00, '2024-04-03', 10, 1),
    
    (true, 75000.00, '2024-03-01', 1, 2),
    (true, 92000.00, '2024-04-01', 1, 2),
    
    (false, 15000.00, '2024-03-02', 5, 2),
    (false, 7000.00, '2024-03-06', 6, 2),
    (false, 9000.00, '2024-03-08', 7, 2),
    (false, 12000.00, '2024-03-20', 11, 2),
    (false, 6000.00, '2024-04-05', 12, 2)
ON CONFLICT DO NOTHING;

INSERT INTO AccountLogs (logName, userLog) VALUES
    ('Регистрация пользователя', 1),
    ('Первый вход в систему', 1),
    ('Смена пароля', 1),
    ('Регистрация пользователя', 2),
    ('Регистрация администратора', 3),
    ('Просмотр истории логов', 3)
ON CONFLICT DO NOTHING;
