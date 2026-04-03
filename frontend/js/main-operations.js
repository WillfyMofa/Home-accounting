// main-operations.js - Управление операциями на главной странице (ИСПРАВЛЕННЫЙ)
console.log('💰 ===== main-operations.js ЗАГРУЖЕН =====');

// main-operations.js - ДОБАВЛЯЕМ В НАЧАЛО ФАЙЛА
let mainCategories = []; // Массив для хранения категорий

// Обновляем функцию initMainOperations()
async function initMainOperations() {
    console.log('🏠 Инициализация операций на главной странице');
    
    try {
        // Проверяем авторизацию
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('⚠️  Пользователь не авторизован');
            return;
        }
        
        // Загружаем категории для автодополнения
        await loadMainCategories();
        
        // Инициализируем автодополнение категорий
        initMainCategoryAutocomplete();
        
        // Инициализируем дату
        initDateField();
        
        // Настраиваем форму добавления операции
        setupOperationForm();
        
        // Загружаем последние операции
        loadRecentOperations();
        
        // Обновляем статистику
        updateStatistics();
        
        console.log('✅ Операции на главной инициализированы');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации операций на главной:', error);
    }
}

// НОВАЯ ФУНКЦИЯ: Загрузка категорий для главной страницы
async function loadMainCategories() {
    console.log('🔍 Загрузка категорий для главной страницы...');
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('⚠️  Нет токена для загрузки категорий');
            return;
        }
        
        const response = await fetch(window.API_BASE_URL + '/categories', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            console.error(`❌ Ошибка HTTP при загрузке категорий: ${response.status}`);
            return;
        }
        
        const data = await response.json();
        
        if (data.success) {
            mainCategories = data.categories || [];
            console.log(`✅ Загружено ${mainCategories.length} категорий для главной`);
            
            // Сохраняем в глобальной области для доступа из других функций
            window.mainCategories = mainCategories;
            
            // Если есть поле категории, обновляем его
            const categoryInput = document.getElementById('category');
            if (categoryInput && categoryInput.value) {
                // Обновляем подсказки если что-то уже введено
                setTimeout(() => {
                    if (window.categoryAutocompleteMain && categoryInput.value.trim().length >= 2) {
                        window.categoryAutocompleteMain.showSuggestions(categoryInput.value.trim());
                    }
                }, 100);
            }
            
        } else {
            console.error('❌ Ошибка в ответе сервера при загрузке категорий:', data.error);
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки категорий:', error);
    }
}

// НОВАЯ ФУНКЦИЯ: Инициализация автодополнения категорий на главной
function initMainCategoryAutocomplete() {
    console.log('🔧 Инициализация автодополнения категорий на главной...');
    
    const categoryInput = document.getElementById('category');
    
    if (!categoryInput) {
        console.error('❌ Поле категории не найдено на главной');
        return;
    }
    
    // Проверяем, что класс CategoryAutocomplete доступен
    if (typeof CategoryAutocomplete === 'undefined') {
        console.error('❌ Класс CategoryAutocomplete не найден');
        
        // Пробуем подождать загрузки скрипта
        setTimeout(() => {
            if (typeof CategoryAutocomplete !== 'undefined') {
                initMainCategoryAutocomplete();
            } else {
                console.error('❌ CategoryAutocomplete всё ещё не загружен');
            }
        }, 1000);
        return;
    }
    
    try {
        // Создаем экземпляр автодополнения для главной страницы
        window.categoryAutocompleteMain = new CategoryAutocomplete(categoryInput, mainCategories);
        console.log('✅ Автодополнение категорий на главной инициализировано');
        
        // Добавляем обработчик для обновления категорий при выборе
        categoryInput.addEventListener('categorySelected', function(event) {
            console.log('🏷️ Категория выбрана:', event.detail);
            
            // Можно добавить дополнительную логику при выборе категории
            if (event.detail && event.detail.isNew) {
                // Показываем сообщение о новой категории
                showCategoryHint(`Будет создана новая категория: "${event.detail.name}"`);
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка при создании CategoryAutocomplete:', error);
    }
}

// НОВАЯ ФУНКЦИЯ: Показ подсказки о категории
function showCategoryHint(message) {
    // Удаляем старую подсказку если есть
    const oldHint = document.querySelector('.category-hint-main');
    if (oldHint) oldHint.remove();
    
    // Создаем новую подсказки
    const hint = document.createElement('div');
    hint.className = 'category-hint category-hint-main';
    hint.innerHTML = `
        <i class="fas fa-info-circle"></i>
        <span>${message}</span>
    `;
    
    hint.style.cssText = `
        margin-top: 5px;
        padding: 8px 12px;
        border-radius: 6px;
        background-color: rgba(67, 97, 238, 0.1);
        color: var(--primary-color);
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: fadeIn 0.3s ease;
    `;
    
    // Вставляем после поля категории
    const categoryGroup = document.querySelector('.category-combobox');
    if (categoryGroup) {
        categoryGroup.parentNode.insertBefore(hint, categoryGroup.nextSibling);
        
        // Удаляем подсказку через 5 секунд
        setTimeout(() => {
            if (hint.parentNode) {
                hint.remove();
            }
        }, 5000);
    }
}

// Обновляем handleAddOperation() для работы с автодополнением
async function handleAddOperation() {
    console.log('🔄 Обрабатываем добавление операции...');
    
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
        
        const categoryResponse = await fetch(window.API_BASE_URL + '/categories/check-or-create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                categoryName: category
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
        
        const operationResponse = await fetch(window.API_BASE_URL + '/operations', {
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
            
            // Обновляем список категорий после добавления
            await loadMainCategories();
            
            // Обновляем автодополнение
            if (window.categoryAutocompleteMain) {
                window.categoryAutocompleteMain.updateCategories(mainCategories);
            }
            
            // Перезагрузка последних операций
            await loadRecentOperations();
            
            // Обновление статистики
            await updateStatistics();
            
            // ВАЖНО: Обновляем цели после добавления операции (без задержки!)
            console.log('🎯 Обновляем цели после добавления операции...');
            if (typeof window.refreshTargetsAfterOperation === 'function') {
                // Убираем setTimeout - обновляем сразу!
                await window.refreshTargetsAfterOperation();
                console.log('✅ Цели обновлены после операции');
            } else {
                console.log('⚠️ Функция refreshTargetsAfterOperation не найдена');
            }

            // Также обновляем цели на главной странице
            if (typeof window.refreshMainTargetsAfterOperation === 'function') {
                await window.refreshMainTargetsAfterOperation();
                console.log('✅ Цели на главной обновлены');
            }
            
            console.log('✅ Операция добавлена');
            
        } else {
            showError(operationData.error || 'Ошибка при добавлении операции');
        }
        
    } catch (error) {
        console.error('❌ Ошибка добавления операции:', error);
        showError('Не удалось добавить операцию');
    }
}

// Делаем функции глобальными
window.loadMainCategories = loadMainCategories;
window.initMainCategoryAutocomplete = initMainCategoryAutocomplete;

// Инициализация поля даты
function initDateField() {
    const dateInput = document.getElementById('date');
    if (!dateInput) return;
    
    // Устанавливаем сегодняшнюю дату по умолчанию
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.max = today;
}

// Настройка формы добавления операции
function setupOperationForm() {
    const form = document.getElementById('quick-form');
    if (!form) {
        console.error('❌ Форма добавления операции не найдена');
        return;
    }
    
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        await handleAddOperation();
    });
    
    console.log('✅ Форма добавления операции настроена');
}

// Загрузка последних операций
async function loadRecentOperations() {
    console.log('🔄 Загружаем последние операции...');
    
    const container = document.getElementById('operationsTableBody');
    if (!container) {
        console.error('❌ Контейнер операций не найден');
        return;
    }
    
    try {
        // Показываем индикатор загрузки
        container.innerHTML = `
            <tr class="loading-row">
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                    <p>Загрузка операций...</p>
                </td>
            </tr>
        `;
        
        const token = localStorage.getItem('token');
        if (!token) {
            container.innerHTML = `
                <tr class="empty-row">
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <i class="fas fa-user-lock fa-2x"></i>
                        <p>Требуется авторизация</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        const response = await fetch(window.API_BASE_URL + '/operations', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📥 Ответ сервера на загрузку операций:', response.status);
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 Полученные данные операций:', data);
        
        if (data.success) {
            const operations = data.operations || [];
            console.log(`✅ Операций получено: ${operations.length}`);
            
            if (operations.length > 0) {
                console.log('Пример первой операции:', operations[0]);
            }
            
            // Берем только последние 5 операций (сначала новые)
            const recentOperations = operations
                .sort((a, b) => new Date(b.operationDate || b.operationdate) - new Date(a.operationDate || a.operationdate))
                .slice(0, 5);
            
            console.log('📋 Последние 5 операций:', recentOperations);
            renderRecentOperations(recentOperations);
            
        } else {
            console.error('❌ Ошибка в ответе сервера:', data.error);
            throw new Error(data.error || 'Ошибка сервера');
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки операций:', error);
        container.innerHTML = `
            <tr class="empty-row">
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle fa-2x"></i>
                    <p>Не удалось загрузить операции</p>
                    <p class="hint-text">${error.message}</p>
                    <button class="btn btn-secondary btn-sm" onclick="loadRecentOperations()">
                        <i class="fas fa-redo"></i> Попробовать снова
                    </button>
                </td>
            </tr>
        `;
    }
}

// Отображение последних операций
function renderRecentOperations(operations) {
    console.log('🖼️ Отображаем последние операции:', operations.length);
    console.log('Операции для отображения:', operations);
    
    const container = document.getElementById('operationsTableBody');
    if (!container) return;
    
    if (!operations || operations.length === 0) {
        container.innerHTML = `
            <tr class="empty-row">
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-inbox fa-2x"></i>
                    <p>Нет операций для отображения</p>
                    <p class="hint-text">Добавьте свою первую операцию!</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    operations.forEach((operation, index) => {
        try {
            console.log(`📋 Обработка операции ${index}:`, operation);
            
            // Форматируем дату - используем разные возможные имена полей
            let date = 'Нет даты';
            if (operation.operationDate) {
                try {
                    date = new Date(operation.operationDate).toLocaleDateString('ru-RU');
                } catch (e) {
                    console.error('Ошибка форматирования даты operationDate:', e);
                }
            } else if (operation.operationdate) {
                try {
                    date = new Date(operation.operationdate).toLocaleDateString('ru-RU');
                } catch (e) {
                    console.error('Ошибка форматирования даты operationdate:', e);
                }
            }
            
            console.log(`📅 Дата операции ${index}:`, date);
            
            // Определяем тип операции - исправленная логика
            let isIncome = false;
            
            // Проверяем разные возможные имена полей
            if (operation.isIncome !== undefined) {
                if (typeof operation.isIncome === 'boolean') {
                    isIncome = operation.isIncome;
                } else {
                    isIncome = operation.isIncome === 'true' || operation.isIncome === 1 || operation.isIncome === '1';
                }
            } else if (operation.isincome !== undefined) {
                if (typeof operation.isincome === 'boolean') {
                    isIncome = operation.isincome;
                } else {
                    isIncome = operation.isincome === 'true' || operation.isincome === 1 || operation.isincome === '1';
                }
            }
            
            console.log(`💰 Тип операции ${index}: isIncome =`, isIncome);
            
            const typeText = isIncome ? 'Доход' : 'Расход';
            const typeClass = isIncome ? 'income' : 'expense';
            
            // Форматируем сумму
            let amount = '0.00';
            if (operation.amount) {
                try {
                    const amountNum = parseFloat(operation.amount);
                    amount = amountNum.toLocaleString('ru-RU', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                    console.log(`💵 Сумма операции ${index}:`, amount);
                } catch (e) {
                    console.error('Ошибка форматирования суммы:', e);
                }
            }
            
            // Получаем название категории - используем разные возможные имена полей
            let categoryName = 'Без категории';
            if (operation.categoryName) {
                categoryName = operation.categoryName;
            } else if (operation.categoryname) {
                categoryName = operation.categoryname;
            } else if (operation.category) {
                categoryName = operation.category;
            }
            
            console.log(`🏷️ Категория операции ${index}:`, categoryName);
            
            // Получаем описание
            const description = operation.description || '-';
            
            html += `
                <tr class="${typeClass}-row">
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
                        <div class="actions-group">
                            <button class="btn-icon edit" title="Редактировать" onclick="window.location.href='operations.html'">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon delete" title="Удалить" onclick="window.location.href='operations.html'">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        } catch (error) {
            console.error(`❌ Ошибка обработки операции ${index}:`, error);
            console.error('Данные операции:', operation);
            html += `
                <tr class="error-row">
                    <td colspan="6" style="color: red; text-align: center; padding: 10px;">
                        Ошибка отображения операции
                    </td>
                </tr>
            `;
        }
    });
    
    container.innerHTML = html;
    console.log('✅ Последние операции отображены');
}

// Обновление статистики
async function updateStatistics() {
    console.log('📊 Обновление статистики...');
    
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch(window.API_BASE_URL + '/operations', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const operations = data.operations || [];
                
                // Рассчитываем статистику
                let totalIncome = 0;
                let totalExpense = 0;
                let monthIncome = 0;
                let monthExpense = 0;
                
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                operations.forEach(op => {
                    const amount = parseFloat(op.amount) || 0;
                    const isIncome = op.isIncome === true || op.isIncome === 'true' || op.isincome === true || op.isincome === 'true';
                    
                    if (isIncome) {
                        totalIncome += amount;
                        
                        // Проверяем, относится ли операция к текущему месяцу
                        if (op.operationDate || op.operationdate) {
                            const opDate = new Date(op.operationDate || op.operationdate);
                            if (opDate.getMonth() === currentMonth && opDate.getFullYear() === currentYear) {
                                monthIncome += amount;
                            }
                        }
                    } else {
                        totalExpense += amount;
                        
                        // Проверяем, относится ли операция к текущему месяцу
                        if (op.operationDate || op.operationdate) {
                            const opDate = new Date(op.operationDate || op.operationdate);
                            if (opDate.getMonth() === currentMonth && opDate.getFullYear() === currentYear) {
                                monthExpense += amount;
                            }
                        }
                    }
                });
                
                const balance = totalIncome - totalExpense;
                
                // Обновляем элементы статистики
                const balanceElement = document.querySelector('.stat-card.balance .amount');
                const incomeElement = document.querySelector('.stat-card.income .amount');
                const expenseElement = document.querySelector('.stat-card.expense .amount');
                
                if (balanceElement) {
                    balanceElement.textContent = `${balance >= 0 ? '+' : ''} ${formatCurrency(balance)}`;
                    console.log('💰 Баланс обновлен:', balance);
                }
                
                if (incomeElement) {
                    incomeElement.textContent = `+ ${formatCurrency(monthIncome)}`;
                    console.log('📈 Доходы за месяц:', monthIncome);
                }
                
                if (expenseElement) {
                    expenseElement.textContent = `- ${formatCurrency(monthExpense)}`;
                    console.log('📉 Расходы за месяц:', monthExpense);
                }
                
                console.log('✅ Статистика обновлена');
            }
        } else {
            console.error('❌ Ошибка получения операций для статистики:', response.status);
        }
    } catch (error) {
        console.error('❌ Ошибка обновления статистики:', error);
    }
}

// Вспомогательные функции
function formatNumber(number) {
    return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number);
}

function formatCurrency(amount) {
    return formatNumber(amount) + ' ₽';
}

function showError(message) {
    console.error('❌ Ошибка:', message);
    alert('Ошибка: ' + message);
}

function showSuccess(message) {
    console.log('✅ Успех:', message);
    alert('Успех: ' + message);
}

// Делаем функции глобальными
window.initMainOperations = initMainOperations;
window.loadRecentOperations = loadRecentOperations;
window.updateStatistics = updateStatistics;

console.log('💰 ===== main-operations.js готов =====');