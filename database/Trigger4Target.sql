-- Удаляем старую процедуру, если она существует
DROP PROCEDURE IF EXISTS complete_target(INT, INT);

-- Создаем исправленную процедуру
CREATE OR REPLACE PROCEDURE complete_target(
    p_target_id INT,
    p_user_id INT
)

LANGUAGE plpgsql
AS $$
DECLARE
    v_target_name VARCHAR(100);
    v_target_amount DECIMAL(10, 2);
    v_category_id INT;
    v_category_exists BOOLEAN;
    v_current_amount DECIMAL(10, 2);
BEGIN
    -- Получаем данные цели с блокировкой строки
    SELECT targetName, targetAmount, currentAmount
    INTO v_target_name, v_target_amount, v_current_amount
    FROM Target 
    WHERE targetID = p_target_id 
      AND userTarget = p_user_id;
    
    -- Проверяем, существует ли цель
    IF v_target_name IS NULL THEN
        RAISE EXCEPTION 'Цель не найдена или у вас нет прав на её завершение';
    END IF;
    
    -- Проверяем, не завершена ли уже цель
    IF EXISTS (SELECT 1 FROM Target WHERE targetID = p_target_id AND isCompleted = true) THEN
        RAISE EXCEPTION 'Цель уже завершена';
    END IF;
    
    -- Проверяем, достигнута ли сумма
    IF v_current_amount < v_target_amount THEN
        RAISE EXCEPTION 'Цель не достигнута по сумме. Текущая: %, Необходимо: %', 
                       v_current_amount, v_target_amount;
    END IF;
    
    -- Проверяем существование категории (регистронезависимо)
    SELECT EXISTS (
        SELECT 1 FROM Category WHERE LOWER(categoryName) = LOWER(v_target_name)
    ) INTO v_category_exists;
    
    IF NOT v_category_exists THEN
        -- Создаем новую категорию
        INSERT INTO Category (categoryName)
        VALUES (v_target_name)
        RETURNING categoryID INTO v_category_id;
    ELSE
        -- Получаем ID существующей категории
        SELECT categoryID INTO v_category_id
        FROM Category 
        WHERE LOWER(categoryName) = LOWER(v_target_name)
        LIMIT 1;
    END IF;
    
    -- Создаем запись о расходе
    INSERT INTO StoryRecord (
        isIncome, 
        amount, 
        operationDate, 
        category, 
        userStory
    ) VALUES (
        false,
        v_target_amount,
        CURRENT_DATE,  -- CURRENT_DATE возвращает тип date
        v_category_id,
        p_user_id
    );
    
    -- Обновляем цель как завершенную
    UPDATE Target 
    SET isCompleted = true
    WHERE targetID = p_target_id;
    
    -- Создаем лог (если процедура существует)
    BEGIN
        CALL create_account_log(
            p_user_id,
            'Цель завершена: ' || v_target_name || ' (' || v_target_amount || ' руб.)'
        );
    EXCEPTION 
        WHEN undefined_function THEN 
            -- Процедура не существует, просто пропускаем
            NULL;
    END;
    
    RAISE NOTICE 'Цель "%" завершена успешно. Создана запись о расходе.', v_target_name;
END;
$$;