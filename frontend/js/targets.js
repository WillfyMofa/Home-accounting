// targets.js - исправленная версия (без мерцания)
console.log('🎯 ===== targets.js ЗАГРУЖЕН (исправленная версия) =====');

// Переменные
let editingTargetId = null;
let isInitialized = false;
let isTargetsPageActive = false;

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

function formatNumber(number) {
    return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number);
}

function formatCurrency(amount) {
    return formatNumber(amount) + ' ₽';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease-out;
    `;
    
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== РАСЧЕТ БАЛАНСА =====

async function calculateUserBalance() {
    try {
        console.log('🔄 [TARGETS] Рассчитываем баланс...');
        
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
            console.log(`💰 [TARGETS] Баланс = ${balance} ₽`);
            return balance;
        }
        
        return 0;
        
    } catch (error) {
        console.error('❌ [TARGETS] Ошибка расчета баланса:', error);
        return 0;
    }
}

// ===== РЕНДЕРИНГ ЦЕЛЕЙ (только отфильтрованных) =====

function renderTargets(targets) {
    console.log('🖼️ Отображаем цели:', targets.length);
    
    const container = document.getElementById('targetsList');
    if (!container) return;
    
    if (!targets || targets.length === 0) {
        const emptyMessage = window.currentTab === 'completed' 
            ? 'Нет завершенных целей' 
            : window.currentTab === 'active' 
                ? 'Нет активных целей' 
                : 'Нет целей';
        
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bullseye"></i>
                <h3>${emptyMessage}</h3>
                <p>Создайте свою первую цель!</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    targets.forEach(target => {
        const currentAmount = parseFloat(target.currentAmount) || 0;
        const targetAmount = parseFloat(target.targetAmount) || 0;
        
        const progress = targetAmount > 0 
            ? Math.min(100, (currentAmount / targetAmount) * 100)
            : 0;
        
        let statusIcon = 'fa-bullseye';
        let statusClass = '';
        
        if (target.isCompleted) {
            statusIcon = 'fa-check-circle';
            statusClass = 'completed';
        } else if (progress >= 75) {
            statusIcon = 'fa-trophy';
            statusClass = 'almost-completed';
        }
        
        const isTargetReached = parseFloat(target.currentAmount) >= parseFloat(target.targetAmount);
        const canComplete = !target.isCompleted && isTargetReached;
        const showActionButtons = !target.isCompleted;
        
        html += `
            <div class="target-card ${statusClass}">
                <div class="target-header">
                    <div class="target-title">
                        <h3>
                            <i class="fas ${statusIcon}"></i>
                            ${escapeHtml(target.targetName)}
                            ${target.isCompleted ? '<span class="status-badge">Завершено</span>' : ''}
                        </h3>
                    </div>
                    ${showActionButtons ? `
                    <div class="target-actions">
                        <button class="btn-icon edit" onclick="window.editTarget(${target.id})" title="Редактировать цель">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="window.deleteTarget(${target.id})" title="Удалить цель">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    ` : ''}
                </div>
                
                <div class="target-content">
                    <div class="target-progress">
                        <div class="progress-info">
                            <div class="progress-text">
                                <span class="current">${formatCurrency(currentAmount)}</span>
                                <span class="total">из ${formatCurrency(targetAmount)}</span>
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
                                    onclick="${canComplete ? `window.completeTarget(${target.id})` : ''}"
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
    console.log('Цели отображены');
}

// Эскейпинг HTML для безопасности
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ===== ФИЛЬТРАЦИЯ И РЕНДЕРИНГ =====

function filterAndRenderTargets() {
    console.log('🔍 Фильтруем цели по вкладке:', window.currentTab);
    
    if (!window.targetsData || window.targetsData.length === 0) {
        renderTargets([]);
        return;
    }
    
    let filteredTargets = [];
    
    switch (window.currentTab) {
        case 'active':
            filteredTargets = window.targetsData.filter(target => !target.isCompleted);
            break;
        case 'completed':
            filteredTargets = window.targetsData.filter(target => target.isCompleted);
            break;
        case 'all':
        default:
            filteredTargets = window.targetsData;
            break;
    }
    
    renderTargets(filteredTargets);
}

// ===== ЗАГРУЗКА ЦЕЛЕЙ (сразу с учетом вкладки) =====

async function loadTargets() {
    console.log('🔄 Загружаем цели...');
    
    const container = document.getElementById('targetsList');
    if (!container) {
        console.error('❌ Контейнер целей не найден');
        return;
    }
    
    try {
        // Показываем спиннер
        container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Загрузка целей...</div>';
        
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }
        
        const response = await fetch(window.API_BASE_URL + '/targets', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка HTTP: ' + response.status);
        }
        
        const result = await response.json();
        
        if (result.success) {
            window.targetsData = result.targets || [];
            console.log(`📦 Получено целей: ${window.targetsData.length}`);
            
            // ВАЖНО: применяем фильтр ДО рендеринга
            filterAndRenderTargets();
            console.log('Цели загружены и отфильтрованы');
            
        } else {
            throw new Error(result.error || 'Ошибка сервера');
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки целей:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Ошибка загрузки</h3>
                <p>${escapeHtml(error.message)}</p>
                <button class="btn btn-primary" onclick="window.loadTargets()">
                    <i class="fas fa-redo"></i> Попробовать снова
                </button>
            </div>
        `;
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ ВКЛАДОК (исправленная) =====

function initTabs() {
    console.log('📁 Инициализация вкладок...');
    
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => {
        // Удаляем старые обработчики, чтобы не было дублирования
        tab.removeEventListener('click', tab._clickHandler);
        
        const handler = function() {
            const tabId = this.getAttribute('data-tab');
            console.log('Клик по вкладке:', tabId);
            
            // Убираем активный класс со всех
            tabs.forEach(t => t.classList.remove('active'));
            // Добавляем активный класс текущей
            this.classList.add('active');
            
            // Сохраняем выбор
            localStorage.setItem('activeTab', tabId);
            window.currentTab = tabId;
            
            // Фильтруем и рендерим (без перезагрузки данных)
            filterAndRenderTargets();
        };
        
        tab.addEventListener('click', handler);
        tab._clickHandler = handler;
    });
    
    // Восстанавливаем сохраненную вкладку (НО НЕ ТРИГГЕРИМ КЛИК СРАЗУ)
    const savedTab = localStorage.getItem('activeTab') || 'active';
    window.currentTab = savedTab;
    
    // Устанавливаем активный класс на нужную вкладку
    const activeButton = document.querySelector(`.tab-btn[data-tab="${savedTab}"]`);
    if (activeButton) {
        tabs.forEach(t => t.classList.remove('active'));
        activeButton.classList.add('active');
    }
    
    console.log('📁 Вкладки инициализированы, текущая вкладка:', window.currentTab);
}

// ===== ОСТАЛЬНЫЕ ФУНКЦИИ (управление целями) =====

async function updateSingleTargetCurrentAmount(targetId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Требуется авторизация');
        
        const balance = await calculateUserBalance();
        const effectiveBalance = Math.max(0, balance);
        
        const response = await fetch(`${window.API_BASE_URL}/targets/${targetId}/current-amount`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentAmount: effectiveBalance })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && window.targetsData) {
                const targetIndex = window.targetsData.findIndex(t => t.id == targetId);
                if (targetIndex !== -1) {
                    window.targetsData[targetIndex].currentAmount = result.target.currentAmount;
                    filterAndRenderTargets();
                }
            }
            return result.target;
        }
        return null;
    } catch (error) {
        console.error('Ошибка обновления цели:', error);
        return null;
    }
}

async function completeTarget(targetId) {
    const target = window.targetsData?.find(t => t.id == targetId);
    
    if (!target) {
        alert('Цель не найдена');
        return;
    }
    
    // Проверяем, достигнута ли целевая сумма
    if (parseFloat(target.currentAmount) < parseFloat(target.targetAmount)) {
        alert('❌ Невозможно завершить цель: целевая сумма не достигнута!');
        return;
    }
    
    if (!confirm('Вы уверены, что хотите завершить эту цель?')) return;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Требуется авторизация');
        
        // Отправляем запрос на завершение цели
        const response = await fetch(window.API_BASE_URL + '/targets/' + targetId + '/complete', {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Ошибка завершения');
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('🎉 Цель успешно завершена!', 'success');
            await loadTargets(); // Перезагружаем цели (теперь isCompleted = true)
        } else {
            throw new Error(result.error || 'Неизвестная ошибка');
        }
    } catch (error) {
        console.error('Ошибка завершения цели:', error);
        alert('❌ Ошибка: ' + error.message);
    }
}

async function deleteTarget(targetId) {
    const target = window.targetsData?.find(t => t.id == targetId);
    if (!target) {
        alert('Цель не найдена');
        return;
    }
    
    const message = target.isCompleted 
        ? 'Вы уверены, что хотите удалить завершенную цель?'
        : 'Вы уверены, что хотите удалить эту цель?';
    
    if (!confirm(message)) return;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Требуется авторизация');
        
        const response = await fetch(window.API_BASE_URL + '/targets/' + targetId, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showNotification('Цель успешно удалена!', 'success');
                await loadTargets();
            } else {
                throw new Error(result.error || 'Ошибка удаления');
            }
        } else {
            throw new Error('Ошибка HTTP: ' + response.status);
        }
    } catch (error) {
        console.error('Ошибка удаления цели:', error);
        alert('❌ Ошибка: ' + error.message);
    }
}

function editTarget(targetId) {
    const target = window.targetsData?.find(t => t.id == targetId);
    
    if (!target) {
        alert('Цель не найдена');
        return;
    }
    
    if (target.isCompleted) {
        alert('❌ Невозможно редактировать завершенную цель!');
        return;
    }
    
    openEditModal(target);
}

function openEditModal(target) {
    editingTargetId = target.id;
    
    document.getElementById('editTargetId').value = target.id;
    document.getElementById('editTargetName').value = target.targetName;
    document.getElementById('editTargetAmount').value = target.targetAmount;
    
    const infoBlock = document.getElementById('editTargetInfo');
    const currentAmountDisplay = document.getElementById('editCurrentAmountDisplay');
    const progressDisplay = document.getElementById('editProgressDisplay');
    
    if (infoBlock && currentAmountDisplay && progressDisplay) {
        currentAmountDisplay.textContent = formatNumber(target.currentAmount);
        const progress = target.targetAmount > 0 
            ? Math.min(100, (target.currentAmount / target.targetAmount) * 100)
            : 0;
        progressDisplay.textContent = progress.toFixed(1);
        infoBlock.style.display = 'block';
    }
    
    const modal = document.getElementById('editTargetModal');
    modal.classList.add('show');
    
    setTimeout(() => {
        document.getElementById('editTargetName').focus();
        document.getElementById('editTargetName').select();
    }, 100);
}

function closeEditModal() {
    const modal = document.getElementById('editTargetModal');
    modal.classList.remove('show');
    document.getElementById('editTargetForm').reset();
    document.getElementById('editTargetId').value = '';
    const infoBlock = document.getElementById('editTargetInfo');
    if (infoBlock) infoBlock.style.display = 'none';
    editingTargetId = null;
}

async function handleSaveTarget() {
    if (!editingTargetId) return;
    
    const target = window.targetsData?.find(t => t.id == editingTargetId);
    if (target?.isCompleted) {
        alert('❌ Невозможно редактировать завершенную цель!');
        closeEditModal();
        return;
    }
    
    const targetName = document.getElementById('editTargetName').value.trim();
    const targetAmount = document.getElementById('editTargetAmount').value;
    
    if (!targetName) {
        alert('Введите название цели');
        return;
    }
    
    if (!targetAmount || parseFloat(targetAmount) <= 0) {
        alert('Введите корректную сумму цели (больше 0)');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Требуется авторизация');
        
        const saveBtn = document.getElementById('saveTarget');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
        saveBtn.disabled = true;
        
        const response = await fetch(window.API_BASE_URL + '/targets/' + editingTargetId, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                targetName: targetName,
                targetAmount: parseFloat(targetAmount)
            })
        });
        
        if (!response.ok) throw new Error('Ошибка обновления');
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Цель успешно обновлена!', 'success');
            closeEditModal();
            await loadTargets();
        } else {
            throw new Error(result.error || 'Неизвестная ошибка');
        }
        
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        alert('❌ Ошибка: ' + error.message);
    }
}

function setupEditModal() {
    const modal = document.getElementById('editTargetModal');
    const closeBtn = document.getElementById('closeEditModal');
    const cancelBtn = document.getElementById('cancelEdit');
    const saveBtn = document.getElementById('saveTarget');
    
    if (!modal) return;
    
    if (closeBtn) closeBtn.addEventListener('click', closeEditModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeEditModal);
    if (saveBtn) saveBtn.addEventListener('click', handleSaveTarget);
    
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeEditModal();
    });
    
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('show')) {
            closeEditModal();
        }
    });
}

async function handleTargetFormSubmit() {
    try {
        const targetName = document.getElementById('targetName').value.trim();
        const targetAmount = document.getElementById('targetAmount').value;
        
        if (!targetName) {
            alert('Введите название цели');
            return;
        }
        
        if (!targetAmount || parseFloat(targetAmount) <= 0) {
            alert('Введите корректную сумму цели (больше 0)');
            return;
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Требуется авторизация');
            window.location.href = 'login.html';
            return;
        }
        
        const submitBtn = document.querySelector('#targetForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Создание...';
        submitBtn.disabled = true;
        
        const balance = await calculateUserBalance();
        const currentAmount = Math.max(0, balance);
        
        const response = await fetch(window.API_BASE_URL + '/targets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                targetName: targetName,
                targetAmount: parseFloat(targetAmount),
                currentAmount: currentAmount
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showNotification('Цель успешно создана!', 'success');
                document.getElementById('targetForm').reset();
                await loadTargets();
            } else {
                showNotification('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'), 'error');
            }
        } else {
            showNotification('❌ Ошибка сервера: ' + response.status, 'error');
        }
        
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Ошибка создания цели:', error);
        showNotification('❌ Ошибка: ' + error.message, 'error');
    }
}

function setupTargetForm() {
    const form = document.getElementById('targetForm');
    if (!form) return;
    
    form.removeEventListener('submit', handleTargetFormSubmit);
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        await handleTargetFormSubmit();
    });
}

function stopTargetsUpdates() {
    console.log('🛑 Останавливаем обновления целей');
    isTargetsPageActive = false;
    window.targetsCalculationRunning = false;
}

// targets.js - ИСПРАВЛЕННАЯ функция обновления целей
async function refreshTargetsAfterOperation() {
    console.log('🔄 Обновляем цели после изменения операции...');
    
    // Проверяем, что мы на странице целей
    if (!isTargetsPageActive) {
        console.log('⚠️ Не на странице целей, пропускаем обновление');
        return;
    }
    
    try {
        // 1. Рассчитываем новый баланс
        const balance = await calculateUserBalance();
        const effectiveBalance = Math.max(0, balance);
        
        console.log(`💰 Новый баланс после операции: ${effectiveBalance} ₽`);
        
        // 2. Получаем токен
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('❌ Нет токена');
            return;
        }
        
        // 3. Получаем текущие цели с сервера
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
        
        // 4. Обновляем currentAmount для каждой активной цели
        const activeTargets = targets.filter(t => !t.isCompleted);
        
        console.log(`🎯 Активных целей для обновления: ${activeTargets.length}`);
        
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
        const updatedTargets = await Promise.all(updatePromises);
        const successfulUpdates = updatedTargets.filter(t => t !== null).length;
        
        console.log(`✅ Успешно обновлено ${successfulUpdates} из ${activeTargets.length} целей`);
        
        // 5. Обновляем локальные данные
        if (window.targetsData) {
            for (const target of window.targetsData) {
                if (!target.isCompleted) {
                    target.currentAmount = effectiveBalance;
                    
                }
            }
        }
        
        // 6. Обновляем отображение
        filterAndRenderTargets();
        console.log('✅ Отображение целей обновлено после операции');
        
    } catch (error) {
        console.error('❌ Ошибка обновления целей после операции:', error);
    }
}

// ===== ОСНОВНАЯ ИНИЦИАЛИЗАЦИЯ =====

function initTargetsPage() {
    if (isInitialized) {
        console.log('⚠️ Страница уже инициализирована');
        return;
    }
    
    console.log('🎯 initTargetsPage() вызвана');
    
    try {
        isInitialized = true;
        isTargetsPageActive = true;
        
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        // Инициализируем компоненты
        setupTargetForm();
        setupEditModal();
        initTabs();      // Устанавливает window.currentTab из localStorage
        loadTargets();   // Загружает данные и сразу рендерит с фильтром
        
        console.log('🎯 Страница целей инициализирована, вкладка:', window.currentTab);
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        isInitialized = false;
    }
}

// ===== ЗАПУСК =====

// Экспортируем глобальные функции
window.initTargetsPage = initTargetsPage;
window.loadTargets = loadTargets;
window.deleteTarget = deleteTarget;
window.editTarget = editTarget;
window.completeTarget = completeTarget;
window.filterAndRenderTargets = filterAndRenderTargets;
window.refreshTargetsAfterOperation = refreshTargetsAfterOperation;
window.updateSingleTargetCurrentAmount = updateSingleTargetCurrentAmount;
window.stopTargetsUpdates = stopTargetsUpdates;

// Запускаем инициализацию
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM загружен, запуск initTargetsPage');
        initTargetsPage();
    });
} else {
    console.log('📄 DOM уже загружен, запуск initTargetsPage');
    initTargetsPage();
}

console.log('🎯 ===== targets.js готов =====');