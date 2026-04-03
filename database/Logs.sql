CREATE OR REPLACE PROCEDURE create_account_log(
    p_user_id INT,
    p_log_name VARCHAR(50)
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO AccountLogs (logName, userLog, createdAt)
    VALUES (p_log_name, p_user_id, CURRENT_TIMESTAMP);
    
    RAISE NOTICE 'Лог создан: пользователь %, действие: %', p_user_id, p_log_name;
END;
$$;

CREATE OR REPLACE PROCEDURE log_registration(
    p_user_id INT,
    p_login VARCHAR(50)
)
LANGUAGE plpgsql
AS $$
BEGIN
    CALL create_account_log(p_user_id, 'Регистрация: ' || p_login);
END;
$$;

CREATE OR REPLACE PROCEDURE log_login(
    p_user_id INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_log_message VARCHAR(100);
BEGIN
    v_log_message := 'Вход в систему';
    
    CALL create_account_log(p_user_id, v_log_message);
END;
$$;

CREATE OR REPLACE PROCEDURE log_logout(p_user_id INT)
LANGUAGE plpgsql
AS $$
BEGIN
    CALL create_account_log(p_user_id, 'Выход из системы');
END;
$$;

CREATE OR REPLACE PROCEDURE log_profile_update(
    p_user_id INT,
    p_field_name VARCHAR(30),
    p_old_value TEXT,
    p_new_value TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_log_message VARCHAR(150);
BEGIN
    v_log_message := 'Изменение ' || p_field_name || ': ' || 
                    COALESCE(p_old_value, 'NULL') || ' → ' || 
                    COALESCE(p_new_value, 'NULL');
    
    CALL create_account_log(p_user_id, v_log_message);
END;
$$;

CREATE OR REPLACE PROCEDURE log_password_change(p_user_id INT)
LANGUAGE plpgsql
AS $$
BEGIN
    CALL create_account_log(p_user_id, 'Смена пароля');
END;
$$;

CREATE OR REPLACE PROCEDURE log_role_change(
    p_admin_id INT,
    p_target_user_id INT,
    p_old_role VARCHAR(15),
    p_new_role VARCHAR(15)
)
LANGUAGE plpgsql
AS $$
BEGIN
    CALL create_account_log(
        p_admin_id, 
        'Изменение роли пользователя #' || p_target_user_id || 
        ': ' || p_old_role || ' → ' || p_new_role
    );
    
    CALL create_account_log(
        p_target_user_id,
        'Изменение роли: ' || p_old_role || ' → ' || p_new_role
    );
END;
$$;