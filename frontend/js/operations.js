// Глобальные переменные
let userData = null;
let categories = [];
let operations = [];
let filteredOperations = [];
let currentPage = 1;
const operationsPerPage = 20;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Инициализация страницы операций');
    
    // Проверяем авторизацию
    if (!checkAuth()) {
        return;
    }
    
    // Инициализируем приложение
    init();
});

async function init() {
    try {
        // Инициализация приложения
        await Promise.all([
            loadUserData(),
            loadCategories(),
            loadOperations()
        ]);

        initCategoryAutocomplete();
        
        // Инициализация UI
        initDateField();
        initEvents();
        updateUI();
        
        console.log('✅ Приложение инициализировано');
        
        // Обновляем операции, если ModalManager уже готов
        if (window.modalManager) {
            window.modalManager.operations = window.operations;
            console.log('✅ Операции переданы в ModalManager');
        } else {
            // Или ждем когда он будет готов
            window.addEventListener('modalManagerReady', function() {
                window.modalManager.operations = window.operations;
                console.log('✅ Операции переданы в ModalManager');
            });
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        showError('Не удалось инициализировать приложение');
    }
}

// Проверка авторизации
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Загрузка данных пользователя
async function loadUserData() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Ошибка загрузки данных пользователя');
        }
        
        const data = await response.json();
        if (data.success) {
            userData = data.user;
            window.userData = data.user;
            console.log('✅ Данные пользователя загружены');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки данных пользователя:', error);
        showError('Не удалось загрузить данные пользователя');
    }
}

// Загрузка категорий
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        
        if (data.success) {
            categories = data.categories;
            window.categories = data.categories;
            console.log('✅ Категории загружены:', categories.length);
            
            // Обновляем фильтр категорий
            populateFilterCategories();
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки категорий:', error);
        showError('Не удалось загрузить категории');
    }
}

function initCategoryAutocomplete() {
    const categoryInput = document.getElementById('category');
    if (categoryInput && typeof CategoryAutocomplete !== 'undefined') {
        window.categoryAutocomplete = new CategoryAutocomplete(categoryInput, categories);
        console.log('✅ Автодополнение категорий инициализировано');
    }
}

function populateFilterCategories() {
    const filterCategorySelect = document.getElementById('filterCategory');
    if (!filterCategorySelect) return;
    
    filterCategorySelect.innerHTML = '';
    
    // Добавляем опцию "Все категории"
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Все категории';
    filterCategorySelect.appendChild(allOption);
    
    // Добавляем категории
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.categoryid;
        option.textContent = category.categoryname;
        filterCategorySelect.appendChild(option);
    });
}

// Загрузка операций
async function loadOperations() {
    try {
        const token = localStorage.getItem('token');
        console.log('🔍 Загрузка операций...');
        
        const response = await fetch('/api/operations', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            console.error(`❌ Ошибка HTTP: ${response.status}`);
            showError('Не удалось загрузить операции');
            return;
        }
        
        const data = await response.json();
        
        if (data.success) {
            operations = data.operations || [];
            filteredOperations = [...operations];
            
            // Сохраняем в глобальную область видимости
            window.operations = operations;
            
            console.log(`✅ Операций получено: ${operations.length}`);
            
            if (operations.length > 0) {
                console.log('Первая операция:', operations[0]);
            }
            
            // Сортируем по дате (сначала новые)
            operations.sort((a, b) => new Date(b.operationdate) - new Date(a.operationdate));
            filteredOperations.sort((a, b) => new Date(b.operationdate) - new Date(a.operationdate));
            
            displayOperations();
            updateStatistics();
            
            // Вызываем событие что операции загружены
            window.dispatchEvent(new CustomEvent('operationsLoaded', {
                detail: { operations: operations }
            }));
            
        } else {
            console.error('❌ Ошибка в ответе сервера:', data.error);
            showError(data.error || 'Ошибка при получении операций');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки операций:', error);
        showError('Не удалось загрузить операции');
        displayEmptyOperations();
    }
}

// Отображение операций в таблице
function displayOperations() {
    const tableBody = document.getElementById('operationsTableBody');
    
    console.log('🔄 Отображение операций...');
    console.log('Всего операций:', filteredOperations.length);
    
    if (!filteredOperations || filteredOperations.length === 0) {
        displayEmptyOperations();
        return;
    }
    
    // Рассчитываем пагинацию
    const totalPages = Math.ceil(filteredOperations.length / operationsPerPage);
    const startIndex = (currentPage - 1) * operationsPerPage;
    const endIndex = Math.min(startIndex + operationsPerPage, filteredOperations.length);
    const pageOperations = filteredOperations.slice(startIndex, endIndex);
    
    console.log('Операции на странице:', pageOperations.length);
    
    // Создаем строки таблицы
    let html = '';
    
    pageOperations.forEach((operation, index) => {
        try {
            // Определяем ID операции
            let operationId;
            if (operation.id) {
                operationId = operation.id;
            } else if (operation.storyrecordid) {
                operationId = operation.storyrecordid;
            } else {
                operationId = `temp-${index}`;
            }
            
            // Форматируем дату
            let date = 'Нет даты';
            if (operation.operationdate) {
                try {
                    date = new Date(operation.operationdate).toLocaleDateString('ru-RU');
                } catch (e) {
                    console.error('Ошибка форматирования даты:', e);
                }
            }
            
            // Определяем тип операции
            let isIncome = false;
            if (operation.isincome !== undefined) {
                if (typeof operation.isincome === 'boolean') {
                    isIncome = operation.isincome;
                } else {
                    isIncome = operation.isincome === 'true' || operation.isincome === true;
                }
            }
            
            const typeText = isIncome ? 'Доход' : 'Расход';
            const typeClass = isIncome ? 'income' : 'expense';
            
            // Форматируем сумму
            let amount = '0.00';
            if (operation.amount) {
                try {
                    amount = parseFloat(operation.amount).toLocaleString('ru-RU', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                } catch (e) {
                    console.error('Ошибка форматирования суммы:', e);
                }
            }
            
            // Получаем название категории
            let categoryName = 'Без категории';
            if (operation.categoryname) {
                categoryName = operation.categoryname;
            } else if (operation.categoryName) {
                categoryName = operation.categoryName;
            }
            
            // Получаем описание
            const description = operation.description || '-';
            
            html += `
                <tr class="${typeClass}-row" data-id="${operationId}">
                    <td>${date}</td>
                    <td>
                        <span class="type-badge ${typeClass}">
                            ${typeText}
                        </span>
                    </td>
                    <td>
                        <span class="category-badge">
                            ${categoryName}
                        </span>
                    </td>
                    <td>${description}</td>
                    <td class="amount ${typeClass}">
                        ${isIncome ? '+' : '-'} ${amount} ₽
                    </td>
                    <td>
                        <button class="btn-icon edit" onclick="editOperation('${operationId}')" title="Редактировать">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="deleteOperation('${operationId}')" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        } catch (error) {
            console.error(`❌ Ошибка обработки операции ${index}:`, error);
            html += `
                <tr class="error-row">
                    <td colspan="6" style="color: red; text-align: center;">
                        Ошибка отображения операции
                    </td>
                </tr>
            `;
        }
    });
    
    tableBody.innerHTML = html;
    
    // Создаем пагинацию
    createPagination(totalPages);
    
    console.log('✅ Таблица операций отображена');
}

function displayEmptyOperations() {
    const tableBody = document.getElementById('operationsTableBody');
    tableBody.innerHTML = `
        <tr class="empty-row">
            <td colspan="6" style="text-align: center; padding: 40px;">
                <i class="fas fa-inbox fa-2x" style="color: #ccc; margin-bottom: 10px;"></i>
                <p>Нет операций для отображения</p>
                <p class="hint-text">Добавьте свою первую операцию!</p>
            </td>
        </tr>
    `;
    
    const paginationEl = document.getElementById('pagination');
    if (paginationEl) {
        paginationEl.innerHTML = '';
    }
}

// Создание пагинации
function createPagination(totalPages) {
    const paginationEl = document.getElementById('pagination');
    if (!paginationEl) return;
    
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination-controls">';
    
    // Кнопка "Назад"
    html += `<button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
             onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
             <i class="fas fa-chevron-left"></i>
             </button>`;
    
    // Номера страниц
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="pagination-btn ${currentPage === i ? 'active' : ''}" 
                     onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += '<span class="pagination-dots">...</span>';
        }
    }
    
    // Кнопка "Вперед"
    html += `<button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
             onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
             <i class="fas fa-chevron-right"></i>
             </button>`;
    
    html += '</div>';
    paginationEl.innerHTML = html;
}

// Изменение страницы
window.changePage = function(page) {
    if (page < 1 || page > Math.ceil(filteredOperations.length / operationsPerPage)) return;
    currentPage = page;
    displayOperations();
};

// Обновление статистики
function updateStatistics() {
    console.log('📊 Обновление статистики...');
    
    if (!operations || operations.length === 0) {
        console.log('Нет операций для статистики');
        return;
    }
    
    // Подсчет доходов и расходов
    let totalIncome = 0;
    let totalExpense = 0;
    
    operations.forEach(op => {
        const amount = parseFloat(op.amount) || 0;
        const isIncome = op.isincome === true || op.isincome === 'true';
        
        if (isIncome) {
            totalIncome += amount;
        } else {
            totalExpense += amount;
        }
    });
    
    const balance = totalIncome - totalExpense;
    
    // Обновляем элементы
    const operationsCountEl = document.getElementById('operationsCount');
    const currentBalanceEl = document.getElementById('currentBalance');
    const userBalanceEl = document.getElementById('userBalance');
    
    if (operationsCountEl) {
        operationsCountEl.textContent = operations.length;
        console.log('Количество операций:', operations.length);
    }
    
    if (currentBalanceEl) {
        currentBalanceEl.textContent = balance.toLocaleString('ru-RU', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' ₽';
        console.log('Текущий баланс:', balance);
    }
    
    if (userBalanceEl) {
        userBalanceEl.textContent = `Баланс: ${balance.toLocaleString('ru-RU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        })} ₽`;
    }
    
    console.log('✅ Статистика обновлена');
}

// Обновление UI данными пользователя
function updateUI() {
    console.log('👤 Обновление UI данными пользователя...');
    
    if (!userData) {
        console.log('Нет данных пользователя');
        return;
    }
    
    const usernameEl = document.getElementById('username');
    const userFullNameEl = document.getElementById('userFullName');
    const userEmailEl = document.getElementById('userEmail');
    const userRegDateEl = document.getElementById('userRegDate');
    
    // Обновляем информацию о пользователе
    if (usernameEl) {
        usernameEl.textContent = userData.login || 'Пользователь';
        console.log('Логин установлен:', userData.login);
    }
    
    if (userFullNameEl) {
        const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        userFullNameEl.textContent = fullName || userData.login || 'Пользователь';
        console.log('ФИО установлено:', userFullNameEl.textContent);
    }
    
    if (userEmailEl) {
        userEmailEl.textContent = userData.login || 'email@example.com';
    }
    
    if (userRegDateEl) {
        const regDate = new Date().toLocaleDateString('ru-RU');
        userRegDateEl.textContent = regDate;
    }
    
    console.log('✅ UI обновлен');
}

function initDateField() {
    const dateInput = document.getElementById('date');
    if (!dateInput) return;
    
    // Устанавливаем сегодняшнюю дату по умолчанию
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.max = today;
}

// Инициализация событий
function initEvents() {
    console.log('🎮 Инициализация событий...');
    
    const logoutBtn = document.getElementById('logoutBtn');
    const quickForm = document.getElementById('quick-form');
    
    // Выход из системы
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('✅ Обработчик выхода установлен');
    }
    
    // Добавление новой операции
    if (quickForm) {
        quickForm.addEventListener('submit', handleAddOperation);
        console.log('✅ Обработчик формы добавления установлен');
    }
    
    // Фильтры
    const filterType = document.getElementById('filterType');
    const filterCategory = document.getElementById('filterCategory');
    const filterDateFrom = document.getElementById('filterDateFrom');
    const filterDateTo = document.getElementById('filterDateTo');
    const filterAmountFrom = document.getElementById('filterAmountFrom');
    const filterAmountTo = document.getElementById('filterAmountTo');
    const resetFilters = document.getElementById('resetFilters');
    
    if (filterType) {
        filterType.addEventListener('change', applyFilters);
        console.log('✅ Фильтр по типу установлен');
    }
    
    if (filterCategory) {
        filterCategory.addEventListener('change', applyFilters);
        console.log('✅ Фильтр по категории установлен');
    }
    
    if (filterDateFrom) filterDateFrom.addEventListener('change', applyFilters);
    if (filterDateTo) filterDateTo.addEventListener('change', applyFilters);
    if (filterAmountFrom) filterAmountFrom.addEventListener('input', applyFilters);
    if (filterAmountTo) filterAmountTo.addEventListener('input', applyFilters);
    
    if (resetFilters) {
        resetFilters.addEventListener('click', resetFiltersHandler);
        console.log('✅ Кнопка сброса фильтров установлена');
    }
    
    console.log('✅ Все события инициализированы');
}

// Обработчик сброса фильтров
function resetFiltersHandler() {
    resetFilters();
}

// Обработка выхода
async function handleLogout() {
    try {
        const token = localStorage.getItem('token');
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Ошибка выхода:', error);
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
}

async function handleAddOperation(e) {
    e.preventDefault();
    
    const typeSelect = document.getElementById('type');
    const amountInput = document.getElementById('amount');
    const dateInput = document.getElementById('date');
    const categoryInput = document.getElementById('category');
    const descriptionInput = document.getElementById('description');
    
    if (!typeSelect || !amountInput || !categoryInput) {
        showError('Не все обязательные поля найдены');
        return;
    }
    
    const type = typeSelect.value;
    const amount = amountInput.value;
    const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
    const category = categoryInput.value.trim();
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    
    // Валидация
    if (!amount || parseFloat(amount) <= 0) {
        showError('Введите корректную сумму');
        amountInput.focus();
        return;
    }
    
    if (!category) {
        showError('Введите категорию');
        categoryInput.focus();
        return;
    }
    
    if (category.length < 2) {
        showError('Название категории должно содержать минимум 2 символа');
        categoryInput.focus();
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        // Сначала проверяем/создаем категорию
        console.log('🔍 Проверяем/создаем категорию:', category);
        
        const categoryResponse = await fetch('/api/categories/check-or-create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                categoryName: category  // ТОЛЬКО название, без isIncome
            })
        });
        
        const categoryData = await categoryResponse.json();
        
        if (!categoryData.success) {
            showError(categoryData.error || 'Ошибка при работе с категорией');
            return;
        }
        
        const categoryId = categoryData.categoryId;
        console.log('✅ Категория готова, ID:', categoryId);
        
        // Теперь создаем операцию
        const formData = {
            isIncome: type === 'true',
            amount: parseFloat(amount),
            operationDate: date,
            description: description,
            categoryId: categoryId
        };
        
        console.log('📤 Отправка операции:', formData);
        
        const operationResponse = await fetch('/api/operations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const operationData = await operationResponse.json();
        
        if (operationData.success) {
            showSuccess('Операция успешно добавлена!');
            
            // Сброс формы
            amountInput.value = '';
            categoryInput.value = '';
            if (descriptionInput) descriptionInput.value = '';
            
            // Сохраняем текущую дату
            if (dateInput) {
                const today = new Date().toISOString().split('T')[0];
                dateInput.value = today;
            }
            
            // Перезагрузка данных
            await Promise.all([
                loadCategories(),  // Перезагружаем категории
                loadOperations()   // Перезагружаем операции
            ]);
            
            // Обновляем автодополнение категорий
            if (window.categoryAutocomplete) {
                window.categoryAutocomplete.updateCategories(categories);
            }
            
            // Прокручиваем к таблице операций
            setTimeout(() => {
                const operationsSection = document.querySelector('.transactions-section');
                if (operationsSection) {
                    operationsSection.scrollIntoView({ behavior: 'smooth' });
                }
            }, 500);
            
        } else {
            showError(operationData.error || 'Ошибка при добавлении операции');
        }
        
    } catch (error) {
        console.error('Ошибка добавления операции:', error);
        showError('Не удалось добавить операцию');
    }
}


// Применение фильтров
function applyFilters() {
    console.log('🔍 Применение фильтров...');
    
    const filterType = document.getElementById('filterType')?.value || 'all';
    const filterCategory = document.getElementById('filterCategory')?.value || 'all';
    const filterDateFrom = document.getElementById('filterDateFrom')?.value;
    const filterDateTo = document.getElementById('filterDateTo')?.value;
    const filterAmountFrom = parseFloat(document.getElementById('filterAmountFrom')?.value) || 0;
    const filterAmountTo = parseFloat(document.getElementById('filterAmountTo')?.value) || Infinity;
    
    filteredOperations = operations.filter(operation => {
        // Фильтр по типу
        if (filterType === 'income' && !operation.isincome) return false;
        if (filterType === 'expense' && operation.isincome) return false;
        
        // Фильтр по категории
        if (filterCategory !== 'all' && operation.categoryid != filterCategory) return false;
        
        // Фильтр по дате
        if (filterDateFrom || filterDateTo) {
            const operationDate = new Date(operation.operationdate);
            if (filterDateFrom && operationDate < new Date(filterDateFrom)) return false;
            if (filterDateTo && operationDate > new Date(filterDateTo)) return false;
        }
        
        // Фильтр по сумме
        const amount = parseFloat(operation.amount) || 0;
        if (amount < filterAmountFrom) return false;
        if (amount > filterAmountTo) return false;
        
        return true;
    });
    
    currentPage = 1;
    displayOperations();
    console.log(`✅ Фильтры применены. Отфильтровано: ${filteredOperations.length} операций`);
}

// В файле, где происходит добавление/изменение операций (например, в operations.js)
function refreshTargetsAfterOperation() {
    // Проверяем, открыта ли страница целей
    if (window.location.pathname.includes('targets.html')) {
        console.log('🔄 Обновляем расчет целей после операции...');
        
        // Если страница целей открыта, обновляем расчет
        if (typeof window.updateTargetsCurrentAmounts === 'function') {
            setTimeout(() => {
                window.updateTargetsCurrentAmounts();
            }, 1000);
        }
    } else {
        // Если страница целей не открыта, можно сохранить флаг
        localStorage.setItem('needRefreshTargets', 'true');
    }
}

// При загрузке страницы целей проверяем, нужно ли обновить расчет
if (localStorage.getItem('needRefreshTargets') === 'true') {
    localStorage.removeItem('needRefreshTargets');
    
    // Даем время на загрузку страницы
    setTimeout(() => {
        if (typeof window.updateTargetsCurrentAmounts === 'function') {
            window.updateTargetsCurrentAmounts();
        }
    }, 1500);
}

// Сброс фильтров
function resetFilters() {
    console.log('🔄 Сброс фильтров...');
    
    const filterType = document.getElementById('filterType');
    const filterCategory = document.getElementById('filterCategory');
    const filterDateFrom = document.getElementById('filterDateFrom');
    const filterDateTo = document.getElementById('filterDateTo');
    const filterAmountFrom = document.getElementById('filterAmountFrom');
    const filterAmountTo = document.getElementById('filterAmountTo');
    
    if (filterType) filterType.value = 'all';
    if (filterCategory) filterCategory.value = 'all';
    if (filterDateFrom) filterDateFrom.value = '';
    if (filterDateTo) filterDateTo.value = '';
    if (filterAmountFrom) filterAmountFrom.value = '';
    if (filterAmountTo) filterAmountTo.value = '';
    
    filteredOperations = [...operations];
    currentPage = 1;
    displayOperations();
    
    console.log('✅ Фильтры сброшены');
}

// Уведомления
function showError(message) {
    console.error('❌ Ошибка:', message);
    alert('Ошибка: ' + message);
}

function showSuccess(message) {
    console.log('✅ Успех:', message);
    alert('Успех: ' + message);
}