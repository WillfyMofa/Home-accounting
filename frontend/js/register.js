// js/register.js
document.addEventListener('DOMContentLoaded', function() {
    // Базовый URL для API (изменяйте в зависимости от вашего сервера)
    const API_URL = 'http://localhost:3000/api';
    
    // Элементы формы
    const registerForm = document.getElementById('registerForm');
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const loginInput = document.getElementById('login');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const submitBtn = document.getElementById('submitBtn');
    const successMessage = document.getElementById('successMessage');
    
    // Инициализация
    initPasswordValidation();
    initLoginValidation();
    
    // Обработчик отправки формы
    registerForm.addEventListener('submit', handleSubmit);
    
    function initPasswordValidation() {
        // Валидация пароля в реальном времени
        passwordInput.addEventListener('input', validatePassword);
        confirmPasswordInput.addEventListener('input', validateConfirmPassword);
        
        // Инициализируем начальное состояние
        updatePasswordStrength(passwordInput.value);
    }
    
    function initLoginValidation() {
        // Проверка доступности логина при потере фокуса
        loginInput.addEventListener('blur', checkLoginAvailability);
    }
    
    async function handleSubmit(e) {
        e.preventDefault();
        
        // Сбрасываем все ошибки
        clearErrors();
        
        // Валидация данных
        if (!validateForm()) {
            return;
        }
        
        // Отключаем кнопку и показываем загрузку
        setLoadingState(true);
        
        try {
            // Подготовка данных
            const formData = {
                firstName: firstNameInput.value.trim(),
                lastName: lastNameInput.value.trim(),
                login: loginInput.value.trim(),
                password: passwordInput.value
            };
            
            console.log('Отправка данных регистрации:', formData);
            
            // Отправка запроса на сервер
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Успешная регистрация
                handleRegistrationSuccess(result);
            } else {
                // Ошибка от сервера
                handleRegistrationError(result);
            }
            
        } catch (error) {
            console.error('Ошибка при регистрации:', error);
            showError('register', 'Ошибка подключения к серверу');
            setLoadingState(false);
        }
    }
    
    function validateForm() {
        let isValid = true;
        
        // Проверка имени
        const firstName = firstNameInput.value.trim();
        if (!firstName) {
            showError('firstName', 'Введите имя');
            isValid = false;
        } else if (firstName.length < 2) {
            showError('firstName', 'Имя должно содержать минимум 2 символа');
            isValid = false;
        }
        
        // Проверка логина
        const login = loginInput.value.trim();
        if (!login) {
            showError('login', 'Введите логин');
            isValid = false;
        } else if (login.length < 3) {
            showError('login', 'Логин должен содержать минимум 3 символа');
            isValid = false;
        }
        
        // Проверка пароля
        if (!validatePassword()) {
            isValid = false;
        }
        
        // Проверка подтверждения пароля
        if (!validateConfirmPassword()) {
            isValid = false;
        }
        
        return isValid;
    }
    
    // js/register.js - ОБНОВЛЕННЫЕ ТРЕБОВАНИЯ
    function validatePassword() {
        const password = passwordInput.value;
        let isValid = true;
        let errorMessage = '';
        
        // Проверяем требования
        const requirements = {
            length: password.length >= 4,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            noSpecial: !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password)
        };
        
        // Обновляем отображение требований
        Object.keys(requirements).forEach(key => {
            const element = document.getElementById(`req-${key}`);
            if (element) {
                const icon = element.querySelector('i');
                if (requirements[key]) {
                    element.classList.remove('invalid');
                    element.classList.add('valid');
                    icon.className = 'fas fa-check-circle';
                } else {
                    element.classList.remove('valid');
                    element.classList.add('invalid');
                    icon.className = 'fas fa-times-circle';
                }
            }
        });
        
        // Проверяем все требования и формируем сообщение об ошибке
        if (!requirements.length) {
            errorMessage = 'Пароль должен содержать минимум 8 символов';
            isValid = false;
        } else if (!requirements.uppercase) {
            errorMessage = 'Пароль должен содержать хотя бы одну заглавную букву';
            isValid = false;
        } else if (!requirements.lowercase) {
            errorMessage = 'Пароль должен содержать хотя бы одну строчную букву';
            isValid = false;
        } else if (!requirements.number) {
            errorMessage = 'Пароль должен содержать хотя бы одну цифру';
            isValid = false;
        } else if (!requirements.noSpecial) {
            errorMessage = 'Пароль не должен содержать специальных символов';
            isValid = false;
        }
        
        // Показываем ошибку если есть
        if (errorMessage) {
            showError('password', errorMessage);
        } else {
            // Очищаем ошибку если всё ок
            const errorElement = document.getElementById('passwordError');
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }
        
        // Обновляем индикатор силы пароля
        updatePasswordStrength(password);
        
        return isValid;
    }

    function updatePasswordStrength(password) {
        let strength = 0;
        
        // Критерии силы с новыми требованиями
        if (password.length >= 4) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        
        const strengthText = document.getElementById('strengthText');
        const strengthFill = document.getElementById('strengthFill');
        
        if (password.length === 0) {
            strengthText.textContent = 'Введите пароль';
            strengthFill.style.width = '0%';
            strengthFill.style.backgroundColor = '#ddd';
        } else if (strength <= 1) {
            strengthText.textContent = 'Очень слабый';
            strengthFill.style.width = '25%';
            strengthFill.style.backgroundColor = '#e74c3c';
        } else if (strength <= 2) {
            strengthText.textContent = 'Слабый';
            strengthFill.style.width = '50%';
            strengthFill.style.backgroundColor = '#e74c3c';
        } else if (strength <= 3) {
            strengthText.textContent = 'Средний';
            strengthFill.style.width = '75%';
            strengthFill.style.backgroundColor = '#f39c12';
        } else {
            strengthText.textContent = 'Надёжный';
            strengthFill.style.width = '100%';
            strengthFill.style.backgroundColor = '#2ecc71';
        }
    }
    
    function validateConfirmPassword() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (password !== confirmPassword) {
            showError('confirmPassword', 'Пароли не совпадают');
            return false;
        }
        
        return true;
    }
    
    async function checkLoginAvailability() {
        const login = loginInput.value.trim();
        
        if (login.length < 3) {
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/auth/check-login?login=${encodeURIComponent(login)}`);
            const result = await response.json();
            
            if (!result.available) {
                showError('login', 'Этот логин уже занят');
            }
        } catch (error) {
            console.error('Ошибка проверки логина:', error);
        }
    }
    
    function handleRegistrationSuccess(result) {
        showSuccess('Регистрация успешна! Вы будете перенаправлены...');
        
        // Сохраняем токен и данные пользователя
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        
        // Перенаправление на главную страницу через 2 секунды
        setTimeout(() => {
            window.location.href = 'main.html';
        }, 2000);
    }
    
    function handleRegistrationError(result) {
        // Общая ошибка
        if (result.error) {
            showError('register', result.error);
        }
        // Специфичные ошибки полей
        else if (result.errors) {
            Object.keys(result.errors).forEach(field => {
                showError(field, result.errors[field]);
            });
        }
        
        setLoadingState(false);
    }
    
    function showError(field, message) {
        const errorElement = document.getElementById(`${field}Error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Прокручиваем к ошибке
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        
        // Прокручиваем к сообщению об успехе
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    function clearErrors() {
        document.querySelectorAll('.error-message').forEach(el => {
            el.style.display = 'none';
            el.textContent = '';
        });
        successMessage.style.display = 'none';
    }
    
    function setLoadingState(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
        }
    }
});