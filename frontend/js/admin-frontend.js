// js/admin-frontend.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔧 Инициализация админ панели...');
    
    // Ждем пока страница полностью загрузится
    await waitForAdminTab();
    
    // Инициализируем админ панель
    await initAdminPanel();
});

// Ждем пока вкладка администрирования будет доступна
async function waitForAdminTab() {
    return new Promise((resolve) => {
        const checkTab = () => {
            const adminTab = document.querySelector('#admin.settings-section');
            if (adminTab) {
                console.log('✅ Вкладка администрирования найдена');
                resolve();
            } else {
                console.log('⏳ Ожидание вкладки администрирования...');
                setTimeout(checkTab, 100);
            }
        };
        checkTab();
    });
}

async function initAdminPanel() {
    try {
        console.log('🔄 Инициализация админ панели...');
        
        // Проверяем авторизацию и права
        await checkAdminRights();
        
        // Инициализируем обработчики событий
        initAdminEventListeners();
        
        console.log('✅ Админ панель инициализирована');
    } catch (error) {
        console.error('❌ Ошибка инициализации админ панели:', error);
    }
}

// Проверка прав администратора
async function checkAdminRights() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('❌ Токен не найден');
            hideAdminTab();
            return false;
        }
        
        // Получаем данные пользователя
        const userData = localStorage.getItem('user');
        if (!userData) {
            console.log('❌ Данные пользователя не найдены');
            hideAdminTab();
            return false;
        }
        
        const user = JSON.parse(userData);
        console.log('👤 Проверка пользователя:', user);
        
        if (user.role !== 2 && user.id !== 1) {
            console.log('⛔ Пользователь не является администратором');
            hideAdminTab();
            return false;
        }
        
        console.log('✅ Пользователь является администратором');
        showAdminTab();
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка проверки прав:', error);
        hideAdminTab();
        return false;
    }
}

// Скрыть вкладку администрирования
function hideAdminTab() {
    const adminNavLink = document.querySelector('.settings-nav-link[href="#admin"]');
    if (adminNavLink) {
        adminNavLink.style.display = 'none';
    }
}

// Показать вкладку администрирования
function showAdminTab() {
    const adminNavLink = document.querySelector('.settings-nav-link[href="#admin"]');
    if (adminNavLink) {
        adminNavLink.style.display = 'flex';
    }
}

// Инициализация обработчиков событий
function initAdminEventListeners() {
    // Обработчик переключения на вкладку администрирования
    const adminTabLink = document.querySelector('.settings-nav-link[href="#admin"]');
    if (adminTabLink) {
        adminTabLink.addEventListener('click', async function(e) {
            console.log('📋 Переключение на вкладку администрирования');
            
            // Загружаем данные при первом открытии
            setTimeout(async () => {
                try {
                    await loadAllAdminData();
                } catch (error) {
                    console.error('❌ Ошибка загрузки данных:', error);
                    showNotification('Ошибка загрузки данных. Проверьте права доступа.', 'error');
                }
            }, 100);
        });
    }
    
    // Кнопка добавления категории
    const addCategoryBtn = document.getElementById('add-category-admin');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', handleAddCategory);
    }
    
    // Поиск пользователей
    const userSearchInput = document.getElementById('user-search');
    if (userSearchInput) {
        userSearchInput.addEventListener('input', function(e) {
            handleUserSearch(e);
        });
    }
    
    // Кнопка поиска пользователей
    const userSearchBtn = document.querySelector('#user-search')?.closest('.search-box')?.querySelector('.btn-icon');
    if (userSearchBtn) {
        userSearchBtn.addEventListener('click', () => {
            const searchTerm = userSearchInput.value;
            if (searchTerm) {
                searchUsers(searchTerm);
            } else {
                loadUsers();
            }
        });
    }
    
    // Поиск логов
    const logSearchInput = document.getElementById('log-search');
    if (logSearchInput) {
        logSearchInput.addEventListener('input', function(e) {
            handleLogSearch(e);
        });
    }
    
    // Кнопка поиска логов
    const logSearchBtn = document.querySelector('#log-search')?.closest('.search-box')?.querySelector('.btn-icon');
    if (logSearchBtn) {
        logSearchBtn.addEventListener('click', () => {
            const searchTerm = logSearchInput.value;
            if (searchTerm) {
                searchLogs(searchTerm);
            } else {
                loadLogs();
            }
        });
    }
}

// Загрузка всех данных админ панели
async function loadAllAdminData() {
    try {
        console.log('📥 Загрузка всех данных админ панели...');
        
        // Загружаем последовательно для отладки
        await loadCategories();
        await loadUsers();
        await loadLogs();
        
        console.log('✅ Все данные админ панели загружены');
    } catch (error) {
        console.error('❌ Ошибка загрузки данных админ панели:', error);
        showNotification('Ошибка загрузки данных: ' + error.message, 'error');
    }
}

// ==================== КАТЕГОРИИ ====================

async function loadCategories() {
    try {
        console.log('🔄 Загрузка категорий...');
        
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/admin/categories', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        console.log('📡 Статус ответа категорий:', response.status);
        
        if (!response.ok) {
            if (response.status === 403) {
                console.log('⛔ Нет прав доступа к категориям');
                showNotification('Нет прав доступа к категориям', 'error');
                return;
            }
            const errorText = await response.text();
            console.error('❌ Ошибка ответа:', errorText);
            throw new Error(`HTTP error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Категории загружены:', result);
        
        if (result.success && result.categories) {
            renderCategories(result.categories);
        } else if (result.error) {
            showNotification('Ошибка: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки категорий:', error);
        showNotification('Ошибка загрузки категорий: ' + error.message, 'error');
    }
}

function renderCategories(categories) {
    const container = document.querySelector('.categories-manager');
    if (!container) {
        console.error('❌ Контейнер категорий не найден');
        return;
    }
    
    if (!categories || categories.length === 0) {
        container.innerHTML = '<div class="no-data">Категории не найдены</div>';
        return;
    }
    
    container.innerHTML = '';
    
    categories.forEach(category => {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'category-item';
        categoryElement.innerHTML = `
            <div class="category-info">
                <span class="category-name">${escapeHtml(category.name)}</span>
                <span class="category-id">ID: ${category.id}</span>
            </div>
            <div class="category-actions">
                <button class="btn-icon edit-category" data-id="${category.id}" title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete-category" data-id="${category.id}" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(categoryElement);
    });
    
    // Добавляем обработчики для кнопок
    document.querySelectorAll('.edit-category').forEach(btn => {
        btn.addEventListener('click', handleEditCategory);
    });
    
    document.querySelectorAll('.delete-category').forEach(btn => {
        btn.addEventListener('click', handleDeleteCategory);
    });
}

async function handleEditCategory(e) {
    const categoryId = e.currentTarget.getAttribute('data-id');
    const categoryItem = e.currentTarget.closest('.category-item');
    const currentName = categoryItem.querySelector('.category-name').textContent;
    
    const newName = prompt('Введите новое название категории:', currentName);
    if (!newName || newName.trim() === '' || newName.trim() === currentName) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3000/api/admin/categories/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newName.trim() })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка обновления');
        }
        
        const result = await response.json();
        showNotification(result.message, 'success');
        await loadCategories(); // Перезагружаем категории
    } catch (error) {
        console.error('❌ Ошибка обновления категории:', error);
        showNotification(error.message, 'error');
    }
}

async function handleDeleteCategory(e) {
    const categoryId = e.currentTarget.getAttribute('data-id');
    const categoryItem = e.currentTarget.closest('.category-item');
    const categoryName = categoryItem.querySelector('.category-name').textContent;
    
    if (!confirm(`Вы уверены, что хотите удалить категорию "${categoryName}"?`)) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3000/api/admin/categories/${categoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка удаления');
        }
        
        const result = await response.json();
        showNotification(result.message, 'success');
        await loadCategories(); // Перезагружаем категории
    } catch (error) {
        console.error('❌ Ошибка удаления категории:', error);
        showNotification(error.message, 'error');
    }
}

async function handleAddCategory() {
    const name = prompt('Введите название новой категории:');
    if (!name || name.trim() === '') return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/admin/categories', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: name.trim() })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка создания');
        }
        
        const result = await response.json();
        showNotification(result.message, 'success');
        await loadCategories(); // Перезагружаем категории
    } catch (error) {
        console.error('❌ Ошибка создания категории:', error);
        showNotification(error.message, 'error');
    }
}

// ==================== ПОЛЬЗОВАТЕЛИ ====================

async function loadUsers() {
    try {
        console.log('🔄 Загрузка пользователей...');
        
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        console.log('📡 Статус ответа пользователей:', response.status);
        
        if (!response.ok) {
            if (response.status === 403) {
                console.log('⛔ Нет прав доступа к пользователям');
                showNotification('Нет прав доступа к пользователям', 'error');
                return;
            }
            const errorText = await response.text();
            console.error('❌ Ошибка ответа:', errorText);
            throw new Error(`HTTP error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Пользователи загружены:', result);
        
        if (result.success && result.users) {
            renderUsers(result.users);
        } else if (result.error) {
            showNotification('Ошибка: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки пользователей:', error);
        showNotification('Ошибка загрузки пользователей: ' + error.message, 'error');
    }
}

async function searchUsers(searchTerm) {
    try {
        console.log(`🔍 Поиск пользователей: "${searchTerm}"`);
        
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.success && result.users) {
            const filteredUsers = result.users.filter(user => 
                user.login.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (user.firstname && user.firstname.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (user.lastname && user.lastname.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            renderUsers(filteredUsers);
        }
    } catch (error) {
        console.error('❌ Ошибка поиска пользователей:', error);
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('users-list');
    if (!tbody) {
        console.error('❌ Таблица пользователей не найдена');
        return;
    }
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">Пользователи не найдены</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        // Проверяем наличие полей
        const firstName = user.firstname || user.firstName || '—';
        const lastName = user.lastname || user.lastName || '—';
        const role = user.role || 1;
        
        // Определяем класс для роли
        const roleClass = role == 1 ? 'role-user' : 'role-admin';
        
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${escapeHtml(user.login)}</td>
            <td>${escapeHtml(firstName)}</td>
            <td>${escapeHtml(lastName)}</td>
            <td>
                <select class="role-select ${roleClass}" data-user-id="${user.id}">
                    <option value="1" ${role == 1 ? 'selected' : ''}>Пользователь</option>
                    <option value="2" ${role == 2 ? 'selected' : ''}>Администратор</option>
                </select>
            </td>
            <td>
                <button class="btn-icon delete-user" data-user-id="${user.id}" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Добавляем обработчики
    document.querySelectorAll('.role-select').forEach(select => {
        select.addEventListener('change', handleRoleChange);
    });
    
    document.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', handleDeleteUser);
    });
}

function handleUserSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#users-list tr');
    
    if (searchTerm === '') {
        loadUsers();
        return;
    }
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

async function handleRoleChange(e) {
    const select = e.target;
    const userId = select.getAttribute('data-user-id');
    const newRole = select.value;
    
    // Обновляем классы для визуальной обратной связи
    select.classList.remove('role-user', 'role-admin');
    if (newRole == 1) {
        select.classList.add('role-user');
    } else if (newRole == 2) {
        select.classList.add('role-admin');
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3000/api/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: parseInt(newRole) })
        });
        
        if (!response.ok) {
            const error = await response.json();
            select.value = select.getAttribute('data-previous-value') || '1';
            // Восстанавливаем класс
            select.classList.remove('role-user', 'role-admin');
            if (select.value == 1) select.classList.add('role-user');
            if (select.value == 2) select.classList.add('role-admin');
            throw new Error(error.error || 'Ошибка обновления роли');
        }
        
        const result = await response.json();
        showNotification(result.message, 'success');
        select.setAttribute('data-previous-value', newRole);
    } catch (error) {
        console.error('❌ Ошибка изменения роли:', error);
        showNotification(error.message, 'error');
    }
}

async function handleDeleteUser(e) {
    const userId = e.currentTarget.getAttribute('data-user-id');
    const userRow = e.currentTarget.closest('tr');
    const userLogin = userRow.querySelector('td:nth-child(2)').textContent;
    
    if (!confirm(`Вы уверены, что хотите удалить пользователя "${userLogin}"?`)) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3000/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка удаления');
        }
        
        const result = await response.json();
        showNotification(result.message, 'success');
        await loadUsers(); // Перезагружаем список пользователей
    } catch (error) {
        console.error('❌ Ошибка удаления пользователя:', error);
        showNotification(error.message, 'error');
    }
}

// ==================== ЛОГИ ====================

async function loadLogs() {
    try {
        console.log('🔄 Загрузка логов...');
        
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/admin/logs', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 403) {
                console.log('⛔ Нет прав доступа к логам');
                return;
            }
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Логи загружены:', result.logs?.length || 0);
        
        if (result.success && result.logs) {
            renderLogs(result.logs);
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки логов:', error);
        showNotification('Ошибка загрузки логов', 'error');
    }
}

async function searchLogs(searchTerm) {
    try {
        console.log(`🔍 Поиск логов: "${searchTerm}"`);
        
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3000/api/admin/logs?userId=${searchTerm}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.success && result.logs) {
            renderLogs(result.logs);
        }
    } catch (error) {
        console.error('❌ Ошибка поиска логов:', error);
    }
}

function renderLogs(logs) {
    const tbody = document.getElementById('logs-list');
    if (!tbody) {
        console.error('❌ Таблица логов не найдена');
        return;
    }
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-data">Логи не найдены</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    logs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${log.id}</td>
            <td>${log.user_login ? escapeHtml(log.user_login) : `Пользователь #${log.user_id}`}</td>
            <td>${escapeHtml(log.action)}</td>
            <td>${formatDateTime(log.date)}</td>
        `;
        tbody.appendChild(row);
    });
}

function handleLogSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#logs-list tr');
    
    if (searchTerm === '') {
        loadLogs();
        return;
    }
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function showNotification(message, type = 'info') {
    console.log(`📢 Уведомление [${type}]: ${message}`);
    
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Добавляем стили
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

function formatDateTime(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Добавляем стили для анимации уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .no-data {
        text-align: center;
        padding: 20px;
        color: #666;
        font-style: italic;
    }
`;

async function checkTableStructure() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('📊 Структура таблицы User:', result.tableStructure);
            
            if (result.tableStructure && !result.tableStructure.hasRoleId) {
                console.warn('⚠️ В таблице User нет столбца roleID!');
                console.warn('   Для работы админ панели выполните SQL:');
                console.warn('   ALTER TABLE "User" ADD COLUMN roleID INT DEFAULT 1;');
                console.warn('   UPDATE "User" SET roleID = 2 WHERE userID = 1;');
            }
        }
    } catch (error) {
        console.error('❌ Ошибка проверки структуры таблицы:', error);
    }
}

// Вызываем проверку при инициализации
setTimeout(() => {
    checkTableStructure();
}, 2000);

document.head.appendChild(style);

// Экспортируем функции для использования в других файлах
window.AdminFrontend = {
    loadCategories,
    loadUsers,
    loadLogs,
    loadAllAdminData
};