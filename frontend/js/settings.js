// settings.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Загрузка страницы настроек...');

    const logoutBtn = document.getElementById('profileLogoutBtn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
    
    // Проверяем авторизацию
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('❌ Токен не найден, перенаправляем на логин');
        window.location.href = 'login.html';
        return;
    }
    
    // Проверяем токен
    const isValid = await verifyToken(token);
    if (!isValid) {
        console.warn('❌ Токен недействителен, перенаправляем на логин');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        return;
    }
    
    console.log('✅ Пользователь авторизован, загружаем данные...');
    
    // Загружаем данные пользователя
    await loadUserData();
    
    // Инициализируем все остальные компоненты
    initSettingsTabs();
    initProfileForm();
    initSecurityForm();
    initCategoryManagement();
    initThemeSettings();
    initLanguageSettings();
    initSystemSettings();
});

function logout() {
    if (confirm('Вы уверены, что хотите выйти из аккаунта?')) {
        // Очищаем localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Перенаправляем на страницу входа
        window.location.href = 'login.html';
    }
}

// Функция обновления данных пользователя в форме профиля
function updateUserProfileData() {
    try {
        // Получаем данные пользователя из localStorage
        const userData = JSON.parse(localStorage.getItem('user'));
        
        if (userData) {
            // Обновляем имя и фамилию
            const fullNameElement = document.getElementById('userFullName');
            const firstNameInput = document.getElementById('firstName');
            const lastNameInput = document.getElementById('lastName');
            
            if (fullNameElement && userData.firstName) {
                fullNameElement.textContent = `${userData.lastName || ''} ${userData.firstName}`.trim();
            }
            
            if (firstNameInput && userData.firstName) {
                firstNameInput.value = userData.firstName;
            }
            
            if (lastNameInput && userData.lastName) {
                lastNameInput.value = userData.lastName;
            }
            
            // Обновляем email если есть
            const emailElement = document.getElementById('userEmail');
            if (emailElement && userData.email) {
                emailElement.textContent = userData.email;
            }
        }
    } catch (error) {
        console.error('Ошибка при обновлении данных профиля:', error);
    }
}

// Экспортируем функцию выхода для использования в других скриптах
if (typeof window !== 'undefined') {
    window.logout = logout;
}

// ==================== ФУНКЦИИ ДЛЯ РАБОТЫ С ДАННЫМИ ====================

// Проверка токена
async function verifyToken(token) {
    try {
        console.log('🔐 Проверка токена...');
        
        const response = await fetch('http://localhost:3000/api/auth/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        console.log('📡 Ответ сервера на проверку токена:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Токен валиден:', result);
            return result.success && result.valid === true;
        } else {
            console.warn('❌ Токен невалиден, статус:', response.status);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Ошибка при проверке токена:', error);
        return false;
    }
}

// Загрузка данных пользователя
async function loadUserData() {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            throw new Error('Токен не найден');
        }
        
        console.log('📥 Загрузка данных пользователя...');
        
        const response = await fetch('http://localhost:3000/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Данные пользователя получены:', result.user);
        
        if (result.success && result.user) {
            // Сохраняем данные в localStorage
            localStorage.setItem('user', JSON.stringify(result.user));
            
            // Заполняем форму профиля
            populateProfileForm(result.user);
            
            // Обновляем информацию в аватаре
            updateAvatarInfo(result.user);
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных пользователя:', error);
        
        // Пробуем использовать данные из localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
            console.log('⚠️ Используем данные из localStorage');
            const user = JSON.parse(userData);
            populateProfileForm(user);
            updateAvatarInfo(user);
        } else {
            showNotification('Не удалось загрузить данные профиля', 'error');
        }
    }
}

// Заполнение формы профиля
function populateProfileForm(user) {
    if (!user) {
        console.warn('❌ Нет данных пользователя для заполнения формы');
        return;
    }
    
    console.log('📝 Заполнение формы данными пользователя:', user);
    
    // Сохраняем оригинальные данные
    window.originalUserData = { ...user };
    
    // Заполняем поля формы
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const currencySelect = document.getElementById('currency');
    
    if (firstNameInput) {
        firstNameInput.value = user.firstName || '';
        console.log(`   Установлено имя: ${user.firstName}`);
    }
    
    if (lastNameInput) {
        lastNameInput.value = user.lastName || '';
        console.log(`   Установлена фамилия: ${user.lastName}`);
    }
    
    if (currencySelect) {
        // Добавляем currency, если его нет в user
        if (!user.currency) {
            user.currency = 'RUB';
        }
        currencySelect.value = user.currency || 'RUB';
        console.log(`   Установлена валюта: ${user.currency}`);
    }
    
    // Добавляем обработчики для мгновенного обновления превью
    if (firstNameInput) {
        firstNameInput.addEventListener('input', updatePreviewInRealTime);
    }
    if (lastNameInput) {
        lastNameInput.addEventListener('input', updatePreviewInRealTime);
    }
}

// Обновление предпросмотра в реальном времени
function updatePreviewInRealTime() {
    const firstName = document.getElementById('firstName')?.value || '';
    const lastName = document.getElementById('lastName')?.value || '';
    
    // Обновляем имя в превью
    const fullNameElement = document.querySelector('.avatar-info h4');
    if (fullNameElement) {
        const fullName = `${firstName} ${lastName}`.trim();
        fullNameElement.textContent = fullName || 'Пользователь';
        console.log(`   Превью имени обновлено: ${fullName}`);
    }
    
    // Обновляем инициалы в аватаре
    updateAvatarInitials(firstName, lastName);
}

// Обновление информации в аватаре
function updateAvatarInfo(user) {
    console.log('👤 Обновление информации аватара:', user);
    
    const avatarName = document.querySelector('.avatar-info h4');
    const avatarLogin = document.querySelector('.avatar-info .user-email'); // используем user-email для логина
    
    if (avatarName) {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        avatarName.textContent = fullName || user.login || 'Пользователь';
        console.log(`   Установлено полное имя: ${avatarName.textContent}`);
    }
    
    if (avatarLogin) {
        // Показываем логин вместо email
        avatarLogin.textContent = user.login || 'Логин не указан';
        console.log(`   Установлен логин: ${avatarLogin.textContent}`);
    }
    
    // Обновляем инициалы
    updateAvatarInitials(user.firstName, user.lastName, user.login);
}

function updateAvatarInitials(firstName, lastName, login) {
    const avatarElement = document.querySelector('.avatar');
    if (!avatarElement) {
        console.warn('❌ Элемент аватара не найден');
        return;
    }
    
    const initials = getInitials(firstName, lastName, login);
    console.log(`   Инициалы: ${initials}`);
    
    // Полностью очищаем содержимое .avatar
    avatarElement.innerHTML = '';
    
    // Убедимся что сам .avatar круглый
    Object.assign(avatarElement.style, {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        fontWeight: 'bold',
        color: 'white'
    });
    
    // Создаем элемент для инициалов
    const initialsElement = document.createElement('div');
    initialsElement.className = 'avatar-initials';
    initialsElement.textContent = initials;
    
    // Применяем стили для инициалов
    Object.assign(initialsElement.style, {
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        fontWeight: 'bold',
        color: 'white',
        background: `linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)`
    });
    
    avatarElement.appendChild(initialsElement);
    
    // Применяем акцентный цвет
    const accentColor = localStorage.getItem('accentColor') || '#4361ee';
    const darkerColor = shadeColor(accentColor, -30);
    initialsElement.style.background = `linear-gradient(135deg, ${accentColor} 0%, ${darkerColor} 100%)`;
}

// Функция получения инициалов
function getInitials(firstName, lastName, login) {
    if (firstName && lastName) {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    } else if (firstName) {
        return firstName.charAt(0).toUpperCase();
    } else if (lastName) {
        return lastName.charAt(0).toUpperCase();
    } else if (login) {
        return login.charAt(0).toUpperCase();
    }
    return 'U';
}

// Обновление профиля через API
async function updateUserProfile(formData) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        throw new Error('Требуется авторизация. Токен не найден.');
    }
    
    console.log('📤 Отправка данных профиля на сервер:', formData);
    
    try {
        // Отправляем только firstName, lastName (currency храним локально)
        const response = await fetch('http://localhost:3000/api/auth/me', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                firstName: formData.firstName,
                lastName: formData.lastName,
                currency: formData.currency // Отправляем, но сервер игнорирует
            })
        });
        
        console.log('📥 Статус ответа:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Ошибка сервера:', errorText);
            
            if (response.status === 401) {
                throw new Error('Сессия истекла. Пожалуйста, войдите заново.');
            } else if (response.status === 400) {
                throw new Error('Некорректные данные');
            } else {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }
        }
        
        const result = await response.json();
        console.log('✅ Ответ сервера:', result);
        
        return result;
        
    } catch (error) {
        console.error('❌ Ошибка обновления профиля:', error);
        throw error;
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ КОМПОНЕНТОВ ====================

// Инициализация вкладок настроек
function initSettingsTabs() {
    console.log('🔧 Инициализация вкладок настроек...');
    
    const settingsNavLinks = document.querySelectorAll('.settings-nav-link');
    const settingsSections = document.querySelectorAll('.settings-section');
    
    settingsNavLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            console.log(`   Переключение на вкладку: ${targetId}`);
            
            // Убираем активный класс у всех ссылок
            settingsNavLinks.forEach(l => l.classList.remove('active'));
            // Добавляем активный класс текущей ссылке
            this.classList.add('active');
            
            // Скрываем все секции
            settingsSections.forEach(section => {
                section.classList.remove('active');
            });
            
            // Показываем целевую секцию
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
}

// Инициализация формы профиля
function initProfileForm() {
    console.log('🔧 Инициализация формы профиля...');
    
    const profileForm = document.querySelector('.profile-form');
    if (!profileForm) {
        console.warn('❌ Форма профиля не найдена');
        return;
    }
    
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        console.log('💾 Отправка формы профиля...');
        
        // Собираем данные формы
        const formData = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            currency: document.getElementById('currency')?.value || 'RUB'
        };
        
        console.log('📋 Данные формы:', formData);
        
        // Валидация
        if (!formData.firstName) {
            showNotification('Введите имя', 'error');
            return;
        }
        
        if (formData.firstName.length < 2) {
            showNotification('Имя должно содержать минимум 2 символа', 'error');
            return;
        }
        
        // Показываем загрузку
        const saveBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
        
        try {
            // Отправляем данные на сервер
            const result = await updateUserProfile(formData);
            
            // Обновляем данные в localStorage
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedUser = { ...currentUser, ...formData };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            // Обновляем оригинальные данные
            window.originalUserData = updatedUser;
            
            // Обновляем UI
            updateAvatarInfo(updatedUser);
            
            showNotification(result.message || 'Профиль успешно обновлен!', 'success');
            
        } catch (error) {
            console.error('❌ Ошибка сохранения профиля:', error);
            showNotification(error.message || 'Ошибка сохранения профиля', 'error');
        } finally {
            // Возвращаем кнопку в исходное состояние
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnText;
        }
    });
    
    // Кнопка "Отмена"
    const cancelBtn = document.querySelector('.btn-secondary');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            if (window.originalUserData) {
                console.log('↩️ Отмена изменений профиля');
                populateProfileForm(window.originalUserData);
                updateAvatarInfo(window.originalUserData);
                showNotification('Изменения отменены', 'info');
            }
        });
    }
}

// Инициализация формы безопасности
function initSecurityForm() {
    console.log('🔧 Инициализация формы безопасности...');
    
    const securityForm = document.querySelector('.security-form');
    if (!securityForm) return;

    initPasswordValidation();
    
    securityForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Получаем значения полей
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        console.log('🔐 Попытка смены пароля...');
        
        // Валидация
        if (!currentPassword) {
            showNotification('Введите текущий пароль', 'error');
            return;
        }
        
        if (!newPassword || !confirmPassword) {
            showNotification('Введите новый пароль и подтверждение', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showNotification('Пароли не совпадают!', 'error');
            return;
        }
        
        if (newPassword.length < 8) {
            showNotification('Пароль должен содержать не менее 8 символов', 'error');
            return;
        }
        
        // Дополнительная проверка пароля
        if (!validatePasswordStrength(newPassword)) {
            showNotification('Пароль слишком простой. Используйте буквы разного регистра и цифры.', 'error');
            return;
        }
        
        // Показываем индикатор загрузки
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Смена пароля...';
        
        try {
            // Отправляем запрос на сервер
            const result = await changePassword(currentPassword, newPassword);
            
            if (result.success) {
                showNotification('Пароль успешно изменен!', 'success');
                this.reset(); // Очищаем форму
                console.log('✅ Пароль успешно изменен');
            } else {
                showNotification(result.error || 'Ошибка смены пароля', 'error');
            }
            
        } catch (error) {
            console.error('❌ Ошибка при смене пароля:', error);
            showNotification('Ошибка соединения с сервером', 'error');
            
        } finally {
            // Возвращаем кнопку в исходное состояние
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

function resetPasswordValidation() {
    // Сбрасываем требования
    const requirements = ['length', 'uppercase', 'lowercase', 'number'];
    requirements.forEach(key => {
        const element = document.getElementById(`req-${key}`);
        if (element) {
            element.classList.remove('valid');
        }
    });
    
    // Сбрасываем шкалу сложности
    const strengthText = document.getElementById('strengthText');
    const strengthFill = document.getElementById('strengthFill');
    const passwordStrength = document.querySelector('.password-strength');
    
    if (strengthText) strengthText.textContent = 'Введите пароль';
    if (strengthFill) {
        strengthFill.style.width = '0%';
        strengthFill.style.backgroundColor = '#ddd';
    }
    if (passwordStrength) {
        passwordStrength.className = 'password-strength';
    }
    
    // Сбрасываем сообщение о несовпадении паролей
    const errorElement = document.getElementById('confirmPasswordError');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// Функция для инициализации проверки пароля в реальном времени
function initPasswordValidation() {
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            validatePasswordInRealTime(this.value);
            checkPasswordMatch();
        });
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    }
}

// Проверка сложности пароля
function validatePasswordStrength(password) {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasMinLength = password.length >= 8;
    
    // Минимум 3 из 4 требований
    let strength = 0;
    if (hasUpperCase) strength++;
    if (hasLowerCase) strength++;
    if (hasNumbers) strength++;
    if (hasMinLength) strength++;
    
    return strength >= 3;
}

function validatePasswordInRealTime(password) {
    // Проверяем требования
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password)
    };
    
    // Обновляем отображение требований
    Object.keys(requirements).forEach(key => {
        const element = document.getElementById(`req-${key}`);
        if (element) {
            element.classList.toggle('valid', requirements[key]);
        }
    });
    
    // Обновляем индикатор сложности
    updatePasswordStrength(password);
}

function updatePasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    
    const strengthText = document.getElementById('strengthText');
    const strengthFill = document.getElementById('strengthFill');
    const passwordStrength = document.querySelector('.password-strength');
    
    if (!passwordStrength) return;
    
    // Сбрасываем классы
    passwordStrength.className = 'password-strength';
    
    if (password.length === 0) {
        strengthText.textContent = 'Введите пароль';
        strengthFill.style.width = '0%';
        strengthFill.style.backgroundColor = '#ddd';
    } else if (strength === 1) {
        passwordStrength.classList.add('strength-weak');
        strengthText.textContent = 'Очень слабый';
    } else if (strength === 2) {
        passwordStrength.classList.add('strength-medium');
        strengthText.textContent = 'Слабый';
    } else if (strength === 3) {
        passwordStrength.classList.add('strength-good');
        strengthText.textContent = 'Средний';
    } else if (strength === 4) {
        passwordStrength.classList.add('strength-strong');
        strengthText.textContent = 'Надежный';
    }
}

// Проверка совпадения паролей
function checkPasswordMatch() {
    const newPassword = document.getElementById('newPassword')?.value || '';
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';
    const errorElement = document.getElementById('confirmPasswordError');
    
    if (!errorElement) return;
    
    if (confirmPassword && newPassword !== confirmPassword) {
        errorElement.textContent = 'Пароли не совпадают';
        errorElement.style.display = 'block';
    } else {
        errorElement.style.display = 'none';
    }
}

function initInterface() {
    console.log('🔧 Инициализация интерфейса...');
    
    initTabs();
    initProfileForm();
    initSecurityForm();
    initPasswordValidation();
    initThemeSettings();
    initLanguageSettings();
}

// Функция для отправки запроса на смену пароля
async function changePassword(currentPassword, newPassword) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        throw new Error('Токен не найден. Требуется авторизация.');
    }
    
    console.log('📤 Отправка запроса на смену пароля...');
    
    try {
        const response = await fetch('http://localhost:3000/api/auth/change-password', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });
        
        console.log('📥 Статус ответа:', response.status);
        
        // Проверяем тип ответа
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Сервер вернул не JSON:', text.substring(0, 200));
            throw new Error('Сервер вернул некорректный ответ');
        }
        
        const result = await response.json();
        console.log('Ответ сервера:', result);
        
        if (!response.ok) {
            if (response.status === 400) {
                throw new Error(result.error || 'Некорректные данные');
            } else if (response.status === 401) {
                throw new Error('Сессия истекла. Пожалуйста, войдите заново.');
            } else {
                throw new Error(result.error || `Ошибка сервера: ${response.status}`);
            }
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Ошибка запроса смены пароля:', error);
        throw error;
    }
}

// Инициализация управления категориями
function initCategoryManagement() {
    console.log('🔧 Инициализация управления категориями...');
    
    // Редактирование категорий
    document.querySelectorAll('.category-actions .edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const categoryItem = this.closest('.category-item');
            const categoryName = categoryItem.querySelector('.category-name').textContent;
            
            const newName = prompt('Введите новое название категории:', categoryName);
            if (newName && newName.trim() !== '') {
                categoryItem.querySelector('.category-name').textContent = newName.trim();
                showNotification('Категория обновлена!', 'success');
            }
        });
    });
    
    // Удаление категорий
    document.querySelectorAll('.category-actions .delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const categoryItem = this.closest('.category-item');
            const categoryName = categoryItem.querySelector('.category-name').textContent;
            
            if (confirm(`Вы уверены, что хотите удалить категорию "${categoryName}"?`)) {
                categoryItem.remove();
                showNotification('Категория удалена!', 'success');
            }
        });
    });
}

// Инициализация настроек темы и цвета
// Инициализация настроек темы и цвета
function initThemeSettings() {
    console.log('🎨 Инициализация настроек темы и цвета...');
    
    // Восстанавливаем сохраненную тему
    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedColor = localStorage.getItem('accentColor') || '#4361ee';
    
    console.log('📋 Восстановленные настройки:', { savedTheme, savedColor });
    
    // Устанавливаем выбранную тему в радио-кнопки
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    console.log('🎨 Найдено радио-кнопок темы:', themeRadios.length);
    
    themeRadios.forEach(radio => {
        // Устанавливаем checked состояние
        radio.checked = (radio.value === savedTheme);
        console.log(`🎨 Радио-кнопка "${radio.value}": ${radio.checked ? 'активна' : 'не активна'}`);
        
        // Удаляем старые обработчики (если есть)
        radio.removeEventListener('change', handleThemeChange);
        
        // Добавляем новый обработчик
        radio.addEventListener('change', handleThemeChange);
    });
    
    function handleThemeChange() {
        console.log('🎨 Тема изменена на:', this.value);
        
        if (this.value === 'dark') {
            document.body.classList.add('dark-theme');
        } else if (this.value === 'light') {
            document.body.classList.remove('dark-theme');
        } else if (this.value === 'auto') {
            // Автоопределение
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.toggle('dark-theme', prefersDark);
        }
        
        localStorage.setItem('theme', this.value);
        console.log('🎨 Тема сохранена:', this.value);
    }
    
    // Инициализируем выбор цвета
    initColorSelection(savedColor);
    
    // Кнопка сохранения системных настроек
    const saveSystemBtn = document.getElementById('saveSystemSettings');
    if (saveSystemBtn) {
        saveSystemBtn.addEventListener('click', saveSystemSettings);
        console.log('🎨 Кнопка сохранения найдена');
    }
}

// Инициализация выбора цвета
function initColorSelection(savedColor) {
    console.log('🎨 Инициализация выбора цвета:', savedColor);
    
    // Находим все элементы
    const colorOptions = document.querySelectorAll('.color-option');
    const customColorInput = document.getElementById('customColor');
    
    console.log('🎨 Найдено цветовых опций:', colorOptions.length);
    console.log('🎨 Поле выбора цвета:', customColorInput ? 'найдено' : 'не найдено');
    
    if (colorOptions.length === 0) {
        console.error('❌ Не найдены цветовые опции!');
        return;
    }
    
    // Устанавливаем активный цвет
    colorOptions.forEach(option => {
        const color = option.getAttribute('data-color');
        console.log(`🎨 Проверяем цвет "${color}" с сохраненным "${savedColor}"`);
        
        if (color === savedColor) {
            option.classList.add('active');
            console.log(`🎨 Установлен активный цвет: ${color}`);
            
            // Устанавливаем значение в input color
            if (customColorInput) {
                customColorInput.value = color;
                console.log(`🎨 Значение input установлено: ${color}`);
            }
        }
        
        // Удаляем старые обработчики
        option.removeEventListener('click', handleColorClick);
        
        // Добавляем обработчик клика
        option.addEventListener('click', handleColorClick);
    });
    
    function handleColorClick() {
        const color = this.getAttribute('data-color');
        console.log('🎨 Выбран цвет:', color);
        
        // Убираем активный класс у всех
        colorOptions.forEach(opt => opt.classList.remove('active'));
        
        // Добавляем активный класс выбранному
        this.classList.add('active');
        
        // Устанавливаем значение в input color
        if (customColorInput) {
            customColorInput.value = color;
        }
        
        // Применяем цвет
        applyAccentColor(color);
    }
    
    // Обработчик кастомного цвета
    if (customColorInput) {
        customColorInput.value = savedColor;
        
        // Удаляем старый обработчик
        customColorInput.removeEventListener('change', handleCustomColorChange);
        
        // Добавляем новый обработчик
        customColorInput.addEventListener('change', handleCustomColorChange);
        
        function handleCustomColorChange() {
            const color = this.value;
            console.log('🎨 Кастомный цвет изменен:', color);
            
            // Убираем активный класс у всех пресетов
            colorOptions.forEach(opt => opt.classList.remove('active'));
            
            // Применяем цвет
            applyAccentColor(color);
        }
    }
    
    console.log('🎨 Инициализация цветов завершена');
}

// В settings.js обновить функцию applyAccentColor
function applyAccentColor(color) {
    console.log('🎨 Применение акцентного цвета:', color);
    
    // Применяем цвет через ThemeManager
    if (window.ThemeManager && window.ThemeManager.setAccentColor) {
        console.log('🎨 Используем ThemeManager.setAccentColor');
        window.ThemeManager.setAccentColor(color);
    } else {
        // Fallback: применяем напрямую
        console.log('🎨 ThemeManager не доступен, применяем напрямую');
        
        // Устанавливаем CSS переменные
        document.documentElement.style.setProperty('--primary-color', color);
        const darkerColor = shadeColor(color, -20);
        document.documentElement.style.setProperty('--primary-dark', darkerColor);
        
        // Обновляем аватар
        const avatarElement = document.querySelector('.avatar-initials') || document.querySelector('.avatar');
        if (avatarElement) {
            const gradientDarker = shadeColor(color, -30);
            avatarElement.style.background = `linear-gradient(135deg, ${color} 0%, ${gradientDarker} 100%)`;
        }
        
        localStorage.setItem('accentColor', color);
    }
}

// Добавить в settings.js функцию shadeColor (если её нет)
function shadeColor(color, percent) {
    if (!color || color.length < 7) return color;
    
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    R = Math.round(R);
    G = Math.round(G);
    B = Math.round(B);

    const RR = ((R.toString(16).length == 1) ? "0" + R.toString(16) : R.toString(16));
    const GG = ((G.toString(16).length == 1) ? "0" + G.toString(16) : G.toString(16));
    const BB = ((B.toString(16).length == 1) ? "0" + B.toString(16) : B.toString(16));

    return "#" + RR + GG + BB;
}

// Сохранение системных настроек
function saveSystemSettings() {
    try {
        console.log('💾 Сохранение системных настроек...');
        
        // Сохраняем тему
        const themeRadio = document.querySelector('input[name="theme"]:checked');
        if (!themeRadio) {
            throw new Error('Не выбрана тема');
        }
        const theme = themeRadio.value;
        console.log('💾 Сохраняем тему:', theme);
        localStorage.setItem('theme', theme);
        
        // Применяем тему сразу
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else if (theme === 'light') {
            document.body.classList.remove('dark-theme');
        } else if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.toggle('dark-theme', prefersDark);
        }
        
        // Сохраняем цвет
        const colorInput = document.getElementById('customColor');
        const accentColor = colorInput ? colorInput.value : '#4361ee';
        console.log('💾 Сохраняем цвет:', accentColor);
        localStorage.setItem('accentColor', accentColor);
        
        // Применяем цвет
        applyAccentColor(accentColor);
        
        // Сохраняем язык
        const languageSelect = document.getElementById('language');
        if (languageSelect) {
            const language = languageSelect.value;
            console.log('💾 Сохраняем язык:', language);
            localStorage.setItem('language', language);
        }
        
        console.log('✅ Настройки сохранены:', { theme, accentColor });
        
        showNotification('Системные настройки сохранены!', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка сохранения настроек:', error);
        showNotification(error.message || 'Ошибка сохранения настроек', 'error');
    }
}

// Инициализация настроек языка
function initLanguageSettings() {
    console.log('🔧 Инициализация настроек языка...');
    
    const savedLanguage = localStorage.getItem('language') || 'ru';
    document.getElementById('language').value = savedLanguage;
    
    // Обработчик изменения языка
    document.getElementById('language').addEventListener('change', function() {
        localStorage.setItem('language', this.value);
        showNotification('Язык изменен. Перезагрузите страницу для применения.', 'info');
    });
}

// Инициализация системных настроек
function initSystemSettings() {
    console.log('🔧 Инициализация системных настроек...');
    
    // Кнопка сохранения системных настроек
    const saveSystemBtn = document.getElementById('saveSystemSettings');
    if (saveSystemBtn) {
        saveSystemBtn.addEventListener('click', function() {
            // Сохранение темы
            const theme = document.querySelector('input[name="theme"]:checked').value;
            localStorage.setItem('theme', theme);
            applyTheme(theme);
            
            // Сохранение языка
            const language = document.getElementById('language').value;
            localStorage.setItem('language', language);
            
            showNotification('Системные настройки сохранены!', 'success');
            
            // Перезагрузка через 1 секунду
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        });
    }
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

// Показать уведомление
function showNotification(message, type = 'info') {
    console.log(`📢 Уведомление [${type}]: ${message}`);
    
    // Можно добавить красивый toast уведомления
    alert(`${type.toUpperCase()}: ${message}`);
}

// Для отладки: вывод всех данных из localStorage
console.log('📊 Данные в localStorage:');
console.log('  token:', localStorage.getItem('token') ? 'присутствует' : 'отсутствует');
console.log('  user:', localStorage.getItem('user') || 'отсутствует');