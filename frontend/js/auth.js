// js/auth.js - общие функции для работы с аутентификацией
const API_URL = 'http://localhost:3000/api';

// Проверка авторизации
async function checkAuth() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        return false;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        return result.valid;
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        return false;
    }
}

// Получение данных текущего пользователя
async function getCurrentUser() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        return null;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка получения данных пользователя');
        }
        
        const result = await response.json();
        return result.user;
    } catch (error) {
        console.error('Ошибка получения данных пользователя:', error);
        return null;
    }
}

// Обновление данных пользователя
async function updateUserProfile(userData) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        throw new Error('Требуется авторизация');
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Ошибка обновления данных');
        }
        
        return result;
    } catch (error) {
        console.error('Ошибка обновления данных пользователя:', error);
        throw error;
    }
}

// Выход из системы
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Защита маршрутов (если пользователь не авторизован - на login)
async function protectRoute() {
    const isAuthenticated = await checkAuth();
    
    if (!isAuthenticated) {
        window.location.href = 'login.html';
        return false;
    }
    
    return true;
}

// Загрузка данных пользователя на всех страницах
async function loadUserData() {
    const user = await getCurrentUser();
    
    if (user) {
        // Сохраняем данные пользователя в localStorage для быстрого доступа
        localStorage.setItem('user', JSON.stringify(user));
        
        // Обновляем UI элементы с данными пользователя
        updateUserUI(user);
    }
    
    return user;
}

// Обновление UI элементами с данными пользователя
function updateUserUI(user) {
    // Имя пользователя в header (если есть такой элемент)
    const userNameElements = document.querySelectorAll('.user-name, .user-info, .avatar-info h4');
    userNameElements.forEach(element => {
        if (element.classList.contains('user-name') || element.tagName === 'H4') {
            element.textContent = `${user.firstName} ${user.lastName}`.trim() || user.login;
        }
    });
    
    // Email пользователя
    const userEmailElements = document.querySelectorAll('.user-email, .user-info p');
    userEmailElements.forEach(element => {
        if (element.classList.contains('user-email')) {
            element.textContent = user.email || 'Email не указан';
        }
    });
    
    // Аватар с инициалами
    const avatarElements = document.querySelectorAll('.avatar, .avatar-initials');
    avatarElements.forEach(avatar => {
        if (avatar.classList.contains('avatar')) {
            const initials = getInitials(user.firstName, user.lastName, user.login);
            if (!avatar.querySelector('.avatar-initials')) {
                const initialsElement = document.createElement('div');
                initialsElement.className = 'avatar-initials';
                initialsElement.textContent = initials;
                avatar.innerHTML = '';
                avatar.appendChild(initialsElement);
            }
        }
    });
}

// Получение инициалов
function getInitials(firstName, lastName, login) {
    if (firstName && lastName) {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    } else if (firstName) {
        return firstName.charAt(0).toUpperCase();
    } else if (login) {
        return login.charAt(0).toUpperCase();
    }
    return 'U';
}

// Экспортируем функции
window.Auth = {
    checkAuth,
    getCurrentUser,
    updateUserProfile,
    logout,
    protectRoute,
    loadUserData
};