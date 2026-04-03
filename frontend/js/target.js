// target.js - Управление вкладками (обновленная версия)
console.log('📁 ===== target.js ЗАГРУЖЕН =====');

function initTabs() {
    console.log('📁 Инициализация вкладок...');
    
    const tabs = document.querySelectorAll('.tab-btn');
    console.log('Найдено вкладок:', tabs.length);
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            console.log('Клик по вкладке:', tabId);
            
            // Убираем активный класс
            tabs.forEach(t => t.classList.remove('active'));
            
            // Добавляем активный класс текущей вкладке
            this.classList.add('active');
            
            // Сохраняем выбор
            localStorage.setItem('activeTab', tabId);
            window.currentTab = tabId;
            
            // Фильтруем цели
            if (typeof window.filterAndRenderTargets === 'function') {
                console.log('🔍 Вызываем фильтрацию целей');
                window.filterAndRenderTargets();
            } else {
                console.warn('⚠️ Функция filterAndRenderTargets не найдена');
            }
        });
    });
    
    // Восстанавливаем сохраненную вкладку
    const savedTab = localStorage.getItem('activeTab') || 'active';
    const savedButton = document.querySelector(`[data-tab="${savedTab}"]`);
    
    if (savedButton) {
        // Даем время на загрузку страницы
        setTimeout(() => {
            savedButton.click();
            console.log('📁 Восстановлена вкладка:', savedTab);
        }, 300);
    }
    
    console.log('📁 Вкладки инициализированы');
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('📁 DOM готов, инициализируем вкладки');
    initTabs();
});

console.log('📁 ===== target.js готов =====');