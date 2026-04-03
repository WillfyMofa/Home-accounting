CREATE OR REPLACE FUNCTION trigger_log_registration()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    -- PERFORM pg_sleep(0.1);
    
    CALL log_registration(NEW.userID, NEW.login);
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_user_after_insert
AFTER INSERT ON "User"
FOR EACH ROW
EXECUTE FUNCTION trigger_log_registration();

CREATE OR REPLACE FUNCTION trigger_log_profile_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.firstName IS DISTINCT FROM NEW.firstName THEN
        CALL log_profile_update(
            NEW.userID, 
            'firstName', 
            OLD.firstName, 
            NEW.firstName
        );
    END IF;
    
    IF OLD.lastName IS DISTINCT FROM NEW.lastName THEN
        CALL log_profile_update(
            NEW.userID, 
            'lastName', 
            OLD.lastName, 
            NEW.lastName
        );
    END IF;
    
    IF OLD.login IS DISTINCT FROM NEW.login THEN
        CALL log_profile_update(
            NEW.userID, 
            'login', 
            OLD.login, 
            NEW.login
        );
    END IF;
    
    IF OLD.roleID IS DISTINCT FROM NEW.roleID THEN
        DECLARE
            v_old_role VARCHAR(15);
            v_new_role VARCHAR(15);
        BEGIN
            SELECT roleName INTO v_old_role FROM Role WHERE roleID = OLD.roleID;
            SELECT roleName INTO v_new_role FROM Role WHERE roleID = NEW.roleID;
            
            CALL create_account_log(
                NEW.userID,
                'Изменение роли: ' || COALESCE(v_old_role, 'NULL') || 
                ' → ' || COALESCE(v_new_role, 'NULL')
            );
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_user_after_update
AFTER UPDATE ON "User"
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION trigger_log_profile_changes();

CREATE OR REPLACE FUNCTION trigger_log_user_deletion()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    CALL create_account_log(
        OLD.userID,
        'Удаление аккаунта: ' || OLD.login
    );
    RETURN OLD;
END;
$$;

CREATE TRIGGER tr_user_before_delete
BEFORE DELETE ON "User"
FOR EACH ROW
EXECUTE FUNCTION trigger_log_user_deletion();