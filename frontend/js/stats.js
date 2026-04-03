// stats.js - Страница статистики
console.log('📊 ===== stats.js ЗАГРУЖЕН =====');

// Глобальные переменные
let dynamicsChart = null;
let categoriesChart = null;
let operationsData = [];
let chartData = null;

// Основная функция инициализации
function initStatsPage() {
    console.log('📊 Инициализация страницы статистики');
    
    try {
        // Проверяем авторизацию
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('⚠️  Пользователь не авторизован');
            window.location.href = 'login.html';
            return;
        }
        
        // Настраиваем элементы управления
        setupControls();
        
        // Загружаем данные и строим графики
        loadDataAndRenderCharts();
        
        console.log('✅ Страница статистики инициализирована');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации страницы статистики:', error);
    }
}

// Настройка элементов управления
function setupControls() {
    console.log('⚙️ Настраиваем элементы управления...');
    
    // Тумблеры для графиков
    const showIncomeToggle = document.getElementById('showIncome');
    const showExpenseToggle = document.getElementById('showExpense');
    
    if (showIncomeToggle) {
        showIncomeToggle.addEventListener('change', updateDynamicsChart);
    }
    
    if (showExpenseToggle) {
        showExpenseToggle.addEventListener('change', updateDynamicsChart);
    }
    
    // Селектор периода
    const periodSelect = document.getElementById('periodSelect');
    if (periodSelect) {
        periodSelect.addEventListener('change', loadDataAndRenderCharts);
    }
    
    // Селектор типа категорий
    const categoryTypeSelect = document.getElementById('categoryTypeSelect');
    if (categoryTypeSelect) {
        categoryTypeSelect.addEventListener('change', updateCategoriesChart);
    }
    
    console.log('✅ Элементы управления настроены');
}

// Загрузка данных и построение графиков
async function loadDataAndRenderCharts() {
    console.log('🔄 Загружаем данные и строим графики...');
    
    try {
        const token = localStorage.getItem('token');
        
        // Загружаем операции
        const response = await fetch(window.API_BASE_URL + '/operations', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            operationsData = data.operations || [];
            console.log(`✅ Загружено операций: ${operationsData.length}`);
            
            // Обрабатываем данные
            processChartData();
            
            // Обновляем статистику
            updateStatistics();
            
            // Строим графики
            renderDynamicsChart();
            renderCategoriesChart();
            
        } else {
            throw new Error(data.error || 'Ошибка сервера');
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        showError('Не удалось загрузить данные для статистики');
    }
}

// Обработка данных для графиков
function processChartData() {
    console.log('📈 Обрабатываем данные для графиков...');
    
    const periodSelect = document.getElementById('periodSelect');
    const period = periodSelect ? periodSelect.value : 'year';
    
    // Фильтруем операции по периоду
    let filteredOperations = [...operationsData];
    const now = new Date();
    
    if (period === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filteredOperations = filteredOperations.filter(op => {
            const opDate = new Date(op.operationDate || op.operationdate);
            return opDate >= monthAgo;
        });
    } else if (period === 'quarter') {
        const quarterAgo = new Date(now);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        filteredOperations = filteredOperations.filter(op => {
            const opDate = new Date(op.operationDate || op.operationdate);
            return opDate >= quarterAgo;
        });
    } else if (period === 'year') {
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        filteredOperations = filteredOperations.filter(op => {
            const opDate = new Date(op.operationDate || op.operationdate);
            return opDate >= yearAgo;
        });
    }
    // Для 'all' берем все операции
    
    console.log(`📊 Операций за выбранный период: ${filteredOperations.length}`);
    
    // Группируем по месяцам
    const monthlyData = {};
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    
    // Инициализируем данные для каждого месяца
    months.forEach(month => {
        monthlyData[month] = {
            income: 0,
            expense: 0
        };
    });
    
    // Собираем данные по месяцам
    filteredOperations.forEach(op => {
        const opDate = new Date(op.operationDate || op.operationdate);
        const monthIndex = opDate.getMonth();
        const monthName = months[monthIndex];
        
        const amount = parseFloat(op.amount) || 0;
        const isIncome = op.isIncome === true || op.isIncome === 'true' || op.isincome === true || op.isincome === 'true';
        
        if (isIncome) {
            monthlyData[monthName].income += amount;
        } else {
            monthlyData[monthName].expense += amount;
        }
    });
    
    // Собираем данные для графика
    const labels = months;
    const incomeData = months.map(month => monthlyData[month].income);
    const expenseData = months.map(month => monthlyData[month].expense);
    
    chartData = {
        labels: labels,
        datasets: [
            {
                label: 'Доходы',
                data: incomeData,
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#28a745',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            },
            {
                label: 'Расходы',
                data: expenseData,
                borderColor: '#dc3545',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#dc3545',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }
        ]
    };
    
    console.log('✅ Данные для графиков обработаны');
}

// Обновление статистики
function updateStatistics() {
    console.log('📊 Обновление статистики...');
    
    if (!operationsData || operationsData.length === 0) {
        console.log('Нет данных для статистики');
        return;
    }
    
    // Рассчитываем общую статистику
    let totalIncome = 0;
    let totalExpense = 0;
    let periodIncome = 0;
    let periodExpense = 0;
    
    const periodSelect = document.getElementById('periodSelect');
    const period = periodSelect ? periodSelect.value : 'year';
    const now = new Date();
    let startDate = new Date(now);
    
    // Определяем начальную дату для периода
    switch (period) {
        case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        case 'quarter':
            startDate.setMonth(startDate.getMonth() - 3);
            break;
        case 'year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        case 'all':
            startDate = new Date(0); // Начало времени
            break;
    }
    
    operationsData.forEach(op => {
        const amount = parseFloat(op.amount) || 0;
        const isIncome = op.isIncome === true || op.isIncome === 'true' || op.isincome === true || op.isincome === 'true';
        
        if (isIncome) {
            totalIncome += amount;
            
            // Проверяем, входит ли операция в выбранный период
            const opDate = new Date(op.operationDate || op.operationdate);
            if (opDate >= startDate) {
                periodIncome += amount;
            }
        } else {
            totalExpense += amount;
            
            // Проверяем, входит ли операция в выбранный период
            const opDate = new Date(op.operationDate || op.operationdate);
            if (opDate >= startDate) {
                periodExpense += amount;
            }
        }
    });
    
    const totalBalance = totalIncome - totalExpense;
    const periodBalance = periodIncome - periodExpense;
    
    // Рассчитываем среднее в день
    const daysInPeriod = Math.max(1, Math.floor((now - startDate) / (1000 * 60 * 60 * 24)));
    const avgPerDay = periodIncome > 0 ? (periodIncome - periodExpense) / daysInPeriod : 0;
    
    // Обновляем элементы на странице
    const totalBalanceEl = document.getElementById('totalBalance');
    const totalIncomeEl = document.getElementById('totalIncome');
    const totalExpenseEl = document.getElementById('totalExpense');
    const avgPerDayEl = document.getElementById('avgPerDay');
    const incomePeriodEl = document.getElementById('incomePeriod');
    const expensePeriodEl = document.getElementById('expensePeriod');
    
    if (totalBalanceEl) {
        totalBalanceEl.textContent = `${periodBalance >= 0 ? '+' : ''} ${formatCurrency(periodBalance)}`;
    }
    
    if (totalIncomeEl) {
        totalIncomeEl.textContent = `+ ${formatCurrency(periodIncome)}`;
    }
    
    if (totalExpenseEl) {
        totalExpenseEl.textContent = `- ${formatCurrency(periodExpense)}`;
    }
    
    if (avgPerDayEl) {
        avgPerDayEl.textContent = `${avgPerDay >= 0 ? '+' : ''} ${formatCurrency(avgPerDay)}`;
    }
    
    if (incomePeriodEl) {
        incomePeriodEl.textContent = getPeriodText(period);
    }
    
    if (expensePeriodEl) {
        expensePeriodEl.textContent = getPeriodText(period);
    }
    
    console.log('✅ Статистика обновлена');
}

// Получение текста периода
function getPeriodText(period) {
    switch (period) {
        case 'month':
            return 'за последний месяц';
        case 'quarter':
            return 'за последний квартал';
        case 'year':
            return 'за последний год';
        case 'all':
            return 'за всё время';
        default:
            return 'за период';
    }
}

// Построение графика динамики
function renderDynamicsChart() {
    console.log('📈 Строим график динамики...');
    
    const canvas = document.getElementById('dynamicsChart');
    if (!canvas) {
        console.error('❌ Canvas для графика динамики не найден');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Уничтожаем предыдущий график, если он существует
    if (dynamicsChart) {
        dynamicsChart.destroy();
    }
    
    if (!chartData) {
        console.error('❌ Нет данных для графика');
        return;
    }
    
    // Копируем данные и применяем настройки видимости
    const chartDataCopy = JSON.parse(JSON.stringify(chartData));
    const showIncome = document.getElementById('showIncome')?.checked !== false;
    const showExpense = document.getElementById('showExpense')?.checked !== false;
    
    // Настраиваем видимость линий
    chartDataCopy.datasets[0].hidden = !showIncome;
    chartDataCopy.datasets[1].hidden = !showExpense;
    
    dynamicsChart = new Chart(ctx, {
        type: 'line',
        data: chartDataCopy,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: false, // Скрываем легенду, так как есть тумблеры
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += formatCurrency(context.parsed.y);
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                    },
                    ticks: {
                        color: 'var(--text-secondary)',
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                    },
                    ticks: {
                        color: 'var(--text-secondary)',
                        callback: function(value) {
                            if (value >= 1000) {
                                return (value / 1000) + 'k';
                            }
                            return value;
                        }
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.4
                }
            }
        }
    });
    
    console.log('✅ График динамики построен');
}

// Обновление графика динамики
function updateDynamicsChart() {
    console.log('🔄 Обновляем график динамики...');
    
    if (dynamicsChart && chartData) {
        const showIncome = document.getElementById('showIncome')?.checked !== false;
        const showExpense = document.getElementById('showExpense')?.checked !== false;
        
        dynamicsChart.data.datasets[0].hidden = !showIncome;
        dynamicsChart.data.datasets[1].hidden = !showExpense;
        
        dynamicsChart.update();
        console.log('✅ График динамики обновлен');
    }
}

// Построение круговой диаграммы категорий
function renderCategoriesChart() {
    console.log('🥧 Строим круговую диаграмму категорий...');
    
    const canvas = document.getElementById('categoriesChart');
    if (!canvas) {
        console.error('❌ Canvas для круговой диаграммы не найден');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Уничтожаем предыдущий график, если он существует
    if (categoriesChart) {
        categoriesChart.destroy();
    }
    
    // Получаем данные для выбранного типа
    const categoryTypeSelect = document.getElementById('categoryTypeSelect');
    const categoryType = categoryTypeSelect ? categoryTypeSelect.value : 'expense';
    const isIncome = categoryType === 'income';
    
    // Группируем операции по категориям
    const categoryMap = {};
    let totalAmount = 0;
    
    operationsData.forEach(op => {
        const opIsIncome = op.isIncome === true || op.isIncome === 'true' || op.isincome === true || op.isincome === 'true';
        
        if (opIsIncome === isIncome) {
            const amount = parseFloat(op.amount) || 0;
            const categoryName = op.categoryName || op.categoryname || 'Без категории';
            
            if (!categoryMap[categoryName]) {
                categoryMap[categoryName] = 0;
            }
            
            categoryMap[categoryName] += amount;
            totalAmount += amount;
        }
    });
    
    // Сортируем категории по убыванию суммы
    const sortedCategories = Object.entries(categoryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8); // Берем топ-8 категорий
    
    // Готовим данные для графика
    const labels = sortedCategories.map(item => item[0]);
    const data = sortedCategories.map(item => item[1]);
    
    // Генерируем цвета
    const colors = generateColors(labels.length);
    
    const pieData = {
        labels: labels,
        datasets: [{
            data: data,
            backgroundColor: colors,
            borderColor: 'var(--card-bg)',
            borderWidth: 2,
            hoverOffset: 15
        }]
    };
    
    // Создаем круговую диаграмму
    categoriesChart = new Chart(ctx, {
        type: 'pie',
        data: pieData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: 'var(--text-primary)',
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const percentage = totalAmount > 0 ? Math.round((value / totalAmount) * 100) : 0;
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Обновляем список категорий
    updateCategoriesList(sortedCategories, totalAmount, colors);
    
    console.log('✅ Круговая диаграмма категорий построена');
}

// Обновление списка категорий
function updateCategoriesList(categories, totalAmount, colors) {
    console.log('📋 Обновляем список категорий...');
    
    const container = document.getElementById('categoriesList');
    if (!container) return;
    
    if (!categories || categories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>Нет данных по категориям</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    categories.forEach(([categoryName, amount], index) => {
        const percentage = totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0;
        const color = colors[index] || '#ccc';
        
        html += `
            <div class="category-item">
                <div class="category-info">
                    <div class="category-color" style="background-color: ${color};"></div>
                    <span class="category-name">${categoryName}</span>
                    <span class="category-percentage">${percentage}%</span>
                </div>
                <div class="category-amount">${formatCurrency(amount)}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    console.log('✅ Список категорий обновлен');
}

// Обновление круговой диаграммы
function updateCategoriesChart() {
    console.log('🔄 Обновляем круговую диаграмму категорий...');
    renderCategoriesChart();
}

// Генерация цветов для диаграммы
function generateColors(count) {
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        '#FF6384', '#C9CBCF', '#4BC0C0', '#FFCE56', '#36A2EB', '#FF9F40'
    ];
    
    // Если нужно больше цветов, чем есть в массиве, генерируем случайные
    if (count > colors.length) {
        for (let i = colors.length; i < count; i++) {
            const hue = Math.floor(Math.random() * 360);
            colors.push(`hsl(${hue}, 70%, 60%)`);
        }
    }
    
    return colors.slice(0, count);
}

// Вспомогательные функции
function formatNumber(number) {
    return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number);
}

function formatCurrency(amount) {
    return formatNumber(amount) + ' ₽';
}

function showError(message) {
    console.error('❌ Ошибка:', message);
    alert('Ошибка: ' + message);
}

// Делаем функции глобальными
window.initStatsPage = initStatsPage;

console.log('📊 ===== stats.js готов =====');