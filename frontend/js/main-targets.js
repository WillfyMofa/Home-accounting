// main-targets.js - Управление целями на главной странице
console.log('🎯 ===== main-targets.js ЗАГРУЖЕН =====');

// Основная функция инициализации целей на главной
function initMainTargets() {
    console.log('🏠 Инициализация целей на главной странице');
    
    try {
        // Проверяем авторизацию
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('⚠️  Пользователь не авторизован');
            return;
        }
        
        // Настраиваем кнопку "Новая цель"
        setupNewGoalButton();
        
        // Загружаем цели
        loadMainTargets();
        
        console.log('✅ Цели на главной инициализированы');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации целей на главной:', error);
    }
}

// Настройка кнопки "Новая цель"
function setupNewGoalButton() {
    const addButton = document.getElementById('addNewGoalBtn');
    if (!addButton) {
        console.error('❌ Кнопка "Новая цель" не найдена');
        return;
    }
    
    addButton.addEventListener('click', function() {
        console.log('🎯 Переход к созданию новой цели');
        // Сохраняем флаг, что нужно открыть форму создания
        localStorage.setItem('showGoalForm', 'true');
        // Переходим на страницу целей
        window.location.href = 'targets.html';
    });
}

// Загрузка целей для главной страницы
async function loadMainTargets() {
    console.log('🔄 Загружаем цели для главной страницы...');
    
    const container = document.getElementById('mainTargetsList');
    if (!container) {
        console.error('❌ Контейнер целей на главной не найден');
        return;
    }
    
    try {
        // Показываем индикатор загрузки
        container.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i> Загрузка целей...
            </div>
        `;
        
        // Получаем токен
        const token = localStorage.getItem('token');
        if (!token) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-lock"></i>
                    <h3>Требуется авторизация</h3>
                    <p>Войдите в систему для просмотра целей</p>
                </div>
            `;
            return;
        }
        
        // Запрашиваем цели (только активные)
        console.log('📤 Запрашиваем активные цели...');
        
        const response = await fetch(window.API_BASE_URL + '/targets', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('📦 Получено целей:', result.targets ? result.targets.length : 0);
            
            if (result.success) {
                const targets = result.targets || [];
                // Фильтруем только активные цели (максимум 5 для главной)
                const activeTargets = targets
                    .filter(target => !target.isCompleted)
                    .slice(0, 5); // Показываем до 5 активных целей на главной
                
                renderMainTargets(activeTargets);
                
                // Если нет активных целей, показываем сообщение
                if (activeTargets.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-bullseye"></i>
                            <h3>Нет активных целей</h3>
                            <p>Создайте свою первую цель!</p>
                            <button class="btn btn-primary" onclick="window.location.href='targets.html'">
                                <i class="fas fa-plus"></i> Создать цель
                            </button>
                        </div>
                    `;
                }
            } else {
                throw new Error(result.error || 'Ошибка сервера');
            }
        } else {
            throw new Error('Ошибка HTTP: ' + response.status);
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки целей на главной:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Ошибка загрузки</h3>
                <p>Не удалось загрузить цели</p>
                <button class="btn btn-secondary" onclick="loadMainTargets()">
                    <i class="fas fa-redo"></i> Повторить
                </button>
            </div>
        `;
    }
}

// Отображение целей на главной в том же стиле, что и на странице целей
function renderMainTargets(targets) {
    console.log('🖼️ Отображаем цели на главной:', targets.length);
    
    const container = document.getElementById('mainTargetsList');
    if (!container) return;
    
    if (!targets || targets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bullseye"></i>
                <h3>Нет активных целей</h3>
                <p>Создайте свою первую цель!</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    targets.forEach(target => {
        // Рассчитываем прогресс
        const progress = target.targetAmount > 0 
            ? Math.min(100, (target.currentAmount / target.targetAmount) * 100)
            : 0;
        
        // Определяем иконку в зависимости от статуса
        let statusIcon = 'fa-bullseye';
        let statusClass = '';
        
        if (target.isCompleted) {
            statusIcon = 'fa-check-circle';
            statusClass = 'completed';
        } else if (progress >= 75) {
            statusIcon = 'fa-trophy';
            statusClass = 'almost-completed';
        }
        
        // Проверяем, достигнута ли целевая сумма
        const isTargetReached = parseFloat(target.currentAmount) >= parseFloat(target.targetAmount);
        const canComplete = !target.isCompleted && isTargetReached;
        
        html += `
            <div class="target-card ${statusClass}">
                <div class="target-header">
                    <div class="target-title">
                        <h3>
                            <i class="fas ${statusIcon}"></i>
                            ${target.targetName}
                        </h3>
                    </div>
                </div>
                
                <div class="target-content">
                    <div class="target-progress">
                        <div class="progress-info">
                            <div class="progress-text">
                                <span class="current">${formatCurrency(target.currentAmount)}</span>
                                <span class="total">из ${formatCurrency(target.targetAmount)}</span>
                                <span class="percent">${progress.toFixed(1)}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress}%"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="target-footer">
                        ${target.isCompleted ? 
                            '<div class="completion-info"><i class="fas fa-check-circle"></i> Цель успешно завершена</div>' : 
                            `<button class="btn-complete ${canComplete ? '' : 'disabled'}" 
                                    onclick="completeTargetFromMain(${target.id})"
                                    ${!canComplete ? 'disabled' : ''}
                                    title="${canComplete ? 'Завершить цель' : 'Целевая сумма не достигнута'}">
                                <i class="fas fa-check-circle"></i> Завершить цель
                            </button>`
                        }
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Вспомогательные функции для форматирования
function formatNumber(number) {
    return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number);
}

function formatCurrency(amount) {
    return formatNumber(amount) + ' ₽';
}

async function completeTargetFromMain(targetId) {
    console.log('✅ Завершаем цель с главной ID:', targetId);
    
    // Проверяем, достигнута ли целевая сумма (нужно сначала получить актуальные данные)
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }
        
        // Получаем актуальные данные цели
        const targetsResponse = await fetch(window.API_BASE_URL + '/targets', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const targetsData = await targetsResponse.json();
        const target = targetsData.targets?.find(t => t.id == targetId);
        
        if (!target) {
            alert('Цель не найдена');
            return;
        }
        
        if (parseFloat(target.currentAmount) < parseFloat(target.targetAmount)) {
            alert('❌ Невозможно завершить цель: целевая сумма не достигнута!');
            return;
        }
        
        if (!confirm('Вы уверены, что хотите завершить эту цель?')) return;
        
        // Отправляем запрос на завершение цели
        const response = await fetch(window.API_BASE_URL + '/targets/' + targetId + '/complete', {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка завершения');
        }
        
        const result = await response.json();
        
        if (result.success) {
            alert('🎉 Цель успешно завершена!');
            // Обновляем список целей на главной
            await loadMainTargets();
        } else {
            throw new Error(result.error || 'Неизвестная ошибка при завершении');
        }
        
    } catch (error) {
        console.error('❌ Ошибка завершения цели:', error);
        alert('❌ Ошибка: ' + error.message);
    }
}

// Функция просмотра деталей цели
function viewTargetDetails(targetId) {
    console.log('🔍 Переход к просмотру цели ID:', targetId);
    // Сохраняем ID цели для просмотра
    localStorage.setItem('viewTargetId', targetId);
    // Переходим на страницу целей
    window.location.href = 'targets.html';
}

// main-targets.js - ИСПРАВЛЕННАЯ функция обновления целей на главной
async function refreshMainTargetsAfterOperation() {
    console.log('🔄 Обновляем цели на главной после операции...');
    
    try {
        // Проверяем, что мы на главной странице
        const mainTargetsContainer = document.getElementById('mainTargetsList');
        if (!mainTargetsContainer) {
            console.log('⚠️ Не на главной странице, пропускаем обновление целей');
            return;
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('⚠️ Нет токена');
            return;
        }
        
        // 1. Получаем текущий баланс пользователя
        const balance = await calculateMainUserBalance();
        const effectiveBalance = Math.max(0, balance);
        
        console.log(`💰 Текущий баланс для целей на главной: ${effectiveBalance} ₽`);
        
        // 2. Получаем все цели
        const response = await fetch(window.API_BASE_URL + '/targets', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Ошибка получения целей');
        }
        
        const targets = result.targets || [];
        
        // 3. Обновляем currentAmount для каждой активной цели
        const activeTargets = targets.filter(target => !target.isCompleted);
        
        console.log(`🎯 Активных целей для обновления на главной: ${activeTargets.length}`);
        
        // Обновляем каждую активную цель на сервере
        const updatePromises = activeTargets.map(async (target) => {
            try {
                const updateResponse = await fetch(`${window.API_BASE_URL}/targets/${target.id}/current-amount`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        currentAmount: effectiveBalance
                    })
                });
                
                if (updateResponse.ok) {
                    const updateResult = await updateResponse.json();
                    if (updateResult.success) {
                        console.log(`✅ Цель "${target.targetName}" обновлена: ${updateResult.target.currentAmount} ₽`);
                        return updateResult.target;
                    }
                } else {
                    console.warn(`⚠️ Ошибка обновления цели "${target.targetName}": ${updateResponse.status}`);
                }
                return null;
            } catch (error) {
                console.error(`❌ Ошибка обновления цели "${target.targetName}":`, error);
                return null;
            }
        });
        
        // Ждем завершения всех обновлений
        await Promise.all(updatePromises);
        
        // 4. Перезагружаем отображение целей на главной
        await loadMainTargets();
        console.log('✅ Цели на главной обновлены после операции');
        
    } catch (error) {
        console.error('❌ Ошибка обновления целей на главной:', error);
    }
}

// Функция расчета баланса для главной страницы
async function calculateMainUserBalance() {
    try {
        console.log('🔄 [MAIN] Рассчитываем баланс...');
        
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }
        
        const response = await fetch(window.API_BASE_URL + '/operations', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.operations && Array.isArray(data.operations)) {
            let totalIncome = 0;
            let totalExpense = 0;
            
            data.operations.forEach((op) => {
                const amount = parseFloat(op.amount) || 0;
                const isIncome = op.isIncome === true || 
                                op.isIncome === 'true' || 
                                op.isIncome === 1 || 
                                op.isIncome === '1' ||
                                op.isincome === true ||
                                op.isincome === 'true' ||
                                op.isincome === 1 ||
                                op.isincome === '1';
                
                if (isIncome) {
                    totalIncome += amount;
                } else {
                    totalExpense += amount;
                }
            });
            
            const balance = totalIncome - totalExpense;
            console.log(`💰 [MAIN] Баланс = ${balance} ₽`);
            return balance;
        }
        
        return 0;
        
    } catch (error) {
        console.error('❌ [MAIN] Ошибка расчета баланса:', error);
        return 0;
    }
}

// Добавляем функции в глобальный объект
window.refreshMainTargetsAfterOperation = refreshMainTargetsAfterOperation;
window.calculateMainUserBalance = calculateMainUserBalance;

console.log('🎯 ===== main-targets.js обновлен, добавлена функция refreshMainTargetsAfterOperation =====');

// Делаем функции глобальными
window.initMainTargets = initMainTargets;
window.loadMainTargets = loadMainTargets;
window.completeTargetFromMain = completeTargetFromMain;
window.viewTargetDetails = viewTargetDetails;

console.log('🎯 ===== main-targets.js готов =====');