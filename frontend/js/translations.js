// translations.js - Система переводов для всего приложения

const translations = {
    ru: {
        // Навигация
        dashboard: 'Главная',
        stats: 'Статистика',
        targets: 'Цели',
        operations: 'Операции',
        settings: 'Настройки',
        
        // Общие
        login: 'Вход',
        register: 'Регистрация',
        logout: 'Выйти',
        save: 'Сохранить',
        cancel: 'Отмена',
        delete: 'Удалить',
        edit: 'Редактировать',
        add: 'Добавить',
        loading: 'Загрузка...',
        error: 'Ошибка',
        success: 'Успешно',
        
        // Главная страница
        balance: 'Баланс',
        income: 'Доходы',
        expenses: 'Расходы',
        lastMonth: 'за последний месяц',
        myGoals: 'Мои цели',
        newGoal: 'Новая цель',
        addOperation: 'Добавить операцию',
        operationType: 'Тип операции',
        amount: 'Сумма',
        category: 'Категория',
        date: 'Дата',
        description: 'Описание',
        addRecord: 'Добавить запись',
        recentOperations: 'Последние операции',
        actions: 'Действия',
        
        // Настройки
        profile: 'Профиль',
        security: 'Безопасность',
        myCategories: 'Мои категории',
        systemSettings: 'Системные настройки',
        personalData: 'Личные данные',
        firstName: 'Имя',
        lastName: 'Фамилия',
        currency: 'Основная валюта',
        currentPassword: 'Текущий пароль',
        newPassword: 'Новый пароль',
        confirmPassword: 'Подтвердите пароль',
        changePassword: 'Сменить пароль',
        categoryManagement: 'Управление категориями',
        appearance: 'Внешний вид',
        colorTheme: 'Цветовая тема',
        lightTheme: 'Светлая',
        darkTheme: 'Тёмная',
        autoTheme: 'Авто',
        accentColor: 'Акцентный цвет',
        customColor: 'Выбрать свой цвет',
        interfaceLanguage: 'Язык интерфейса',
        saveSettings: 'Сохранить настройки',
        resetSettings: 'Сбросить настройки',
        
        // Цели
        activeGoals: 'Активные цели',
        completedGoals: 'Выполненные',
        allGoals: 'Все цели',
        goalName: 'Название цели',
        targetAmount: 'Целевая сумма',
        deadline: 'Срок выполнения',
        initialDeposit: 'Начальный взнос',
        createGoal: 'Создать цель',
        completeGoal: 'Завершить цель',
        goalCompleted: 'Цель выполнена ✓',
        
        // Уведомления
        profileUpdated: 'Профиль успешно обновлен!',
        passwordChanged: 'Пароль успешно изменен!',
        categoryUpdated: 'Категория обновлена!',
        categoryDeleted: 'Категория удалена!',
        categoryAdded: 'Категория добавлена!',
        settingsSaved: 'Системные настройки сохранены!',
        settingsReset: 'Настройки сброшены к стандартным',
        
        // Валидация
        passwordsDontMatch: 'Пароли не совпадают!',
        passwordMinLength: 'Пароль должен содержать не менее 8 символов'
    },
    
    en: {
        // Navigation
        dashboard: 'Dashboard',
        stats: 'Statistics',
        targets: 'Targets',
        operations: 'Operations',
        settings: 'Settings',
        
        // Common
        login: 'Login',
        register: 'Register',
        logout: 'Logout',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        
        // Main page
        balance: 'Balance',
        income: 'Income',
        expenses: 'Expenses',
        lastMonth: 'last month',
        myGoals: 'My Goals',
        newGoal: 'New Goal',
        addOperation: 'Add Operation',
        operationType: 'Operation Type',
        amount: 'Amount',
        category: 'Category',
        date: 'Date',
        description: 'Description',
        addRecord: 'Add Record',
        recentOperations: 'Recent Operations',
        actions: 'Actions',
        
        // Settings
        profile: 'Profile',
        security: 'Security',
        myCategories: 'My Categories',
        systemSettings: 'System Settings',
        personalData: 'Personal Data',
        firstName: 'First Name',
        lastName: 'Last Name',
        currency: 'Main Currency',
        currentPassword: 'Current Password',
        newPassword: 'New Password',
        confirmPassword: 'Confirm Password',
        changePassword: 'Change Password',
        categoryManagement: 'Category Management',
        appearance: 'Appearance',
        colorTheme: 'Color Theme',
        lightTheme: 'Light',
        darkTheme: 'Dark',
        autoTheme: 'Auto',
        accentColor: 'Accent Color',
        customColor: 'Choose Custom Color',
        interfaceLanguage: 'Interface Language',
        saveSettings: 'Save Settings',
        resetSettings: 'Reset Settings',
        
        // Targets
        activeGoals: 'Active Goals',
        completedGoals: 'Completed',
        allGoals: 'All Goals',
        goalName: 'Goal Name',
        targetAmount: 'Target Amount',
        deadline: 'Deadline',
        initialDeposit: 'Initial Deposit',
        createGoal: 'Create Goal',
        completeGoal: 'Complete Goal',
        goalCompleted: 'Goal Completed ✓',
        
        // Notifications
        profileUpdated: 'Profile updated successfully!',
        passwordChanged: 'Password changed successfully!',
        categoryUpdated: 'Category updated!',
        categoryDeleted: 'Category deleted!',
        categoryAdded: 'Category added!',
        settingsSaved: 'System settings saved!',
        settingsReset: 'Settings reset to default',
        
        // Validation
        passwordsDontMatch: 'Passwords do not match!',
        passwordMinLength: 'Password must be at least 8 characters'
    }
    
    // Добавьте другие языки по необходимости (kz, de, fr, es, zh)
};

// Функция получения перевода
function getTranslation(key, lang = null) {
    const language = lang || localStorage.getItem('language') || 'ru';
    const langDict = translations[language] || translations.ru;
    
    // Рекурсивный поиск вложенных ключей (например, "notifications.profileUpdated")
    const keys = key.split('.');
    let result = langDict;
    
    for (const k of keys) {
        if (result && result[k] !== undefined) {
            result = result[k];
        } else {
            console.warn(`Translation key not found: ${key} for language ${language}`);
            return key; // Возвращаем ключ, если перевод не найден
        }
    }
    
    return result;
}

// Функция применения языка ко всей странице
function applyLanguage(lang = null) {
    const language = lang || localStorage.getItem('language') || 'ru';
    
    // Сохраняем язык в localStorage
    localStorage.setItem('language', language);
    
    // Обновляем атрибут lang у html
    document.documentElement.lang = language;
    
    // Находим все элементы с data-i18n атрибутом и переводим их
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = getTranslation(key, language);
        
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.placeholder = translation;
        } else if (element.tagName === 'OPTION') {
            element.textContent = translation;
        } else {
            element.textContent = translation;
        }
    });
    
    // Обновляем элементы без data-i18n (навигация, кнопки и т.д.)
    updateCommonElements(language);
}

// Функция обновления общих элементов
function updateCommonElements(language) {
    const t = translations[language] || translations.ru;
    
    // Навигация
    document.querySelectorAll('.nav-link').forEach(link => {
        const icon = link.querySelector('i');
        const currentText = link.textContent.trim();
        
        if (currentText.includes('Главная') || currentText.includes('Dashboard')) {
            link.textContent = '';
            if (icon) link.appendChild(icon.cloneNode(true));
            link.appendChild(document.createTextNode(' ' + t.dashboard));
        }
        else if (currentText.includes('Статистика') || currentText.includes('Statistics')) {
            link.textContent = '';
            if (icon) link.appendChild(icon.cloneNode(true));
            link.appendChild(document.createTextNode(' ' + t.stats));
        }
        else if (currentText.includes('Цели') || currentText.includes('Targets')) {
            link.textContent = '';
            if (icon) link.appendChild(icon.cloneNode(true));
            link.appendChild(document.createTextNode(' ' + t.targets));
        }
        else if (currentText.includes('Операции') || currentText.includes('Operations')) {
            link.textContent = '';
            if (icon) link.appendChild(icon.cloneNode(true));
            link.appendChild(document.createTextNode(' ' + t.operations));
        }
        else if (currentText.includes('Настройки') || currentText.includes('Settings')) {
            link.textContent = '';
            if (icon) link.appendChild(icon.cloneNode(true));
            link.appendChild(document.createTextNode(' ' + t.settings));
        }
    });
    
    // Кнопки
    document.querySelectorAll('.btn').forEach(btn => {
        const currentText = btn.textContent.trim();
        const icon = btn.querySelector('i');
        
        // Определяем тип кнопки по тексту или классам
        if (currentText.includes('Сохранить') || currentText.includes('Save')) {
            btn.textContent = '';
            if (icon) btn.appendChild(icon.cloneNode(true));
            btn.appendChild(document.createTextNode(' ' + t.save));
        }
        else if (currentText.includes('Отмена') || currentText.includes('Cancel')) {
            btn.textContent = '';
            if (icon) btn.appendChild(icon.cloneNode(true));
            btn.appendChild(document.createTextNode(' ' + t.cancel));
        }
        else if (currentText.includes('Добавить') || currentText.includes('Add')) {
            btn.textContent = '';
            if (icon) btn.appendChild(icon.cloneNode(true));
            btn.appendChild(document.createTextNode(' ' + t.add));
        }
        else if (currentText.includes('Удалить') || currentText.includes('Delete')) {
            btn.textContent = '';
            if (icon) btn.appendChild(icon.cloneNode(true));
            btn.appendChild(document.createTextNode(' ' + t.delete));
        }
        else if (currentText.includes('Редактировать') || currentText.includes('Edit')) {
            btn.textContent = '';
            if (icon) btn.appendChild(icon.cloneNode(true));
            btn.appendChild(document.createTextNode(' ' + t.edit));
        }
    });
    
    // Заголовки страниц
    const pageTitle = document.querySelector('title');
    if (pageTitle) {
        if (pageTitle.textContent.includes('Главная') || pageTitle.textContent.includes('Dashboard')) {
            pageTitle.textContent = t.dashboard + ' | Домашняя бухгалтерия';
        }
        else if (pageTitle.textContent.includes('Статистика') || pageTitle.textContent.includes('Statistics')) {
            pageTitle.textContent = t.stats + ' | Домашняя бухгалтерия';
        }
        else if (pageTitle.textContent.includes('Цели') || pageTitle.textContent.includes('Targets')) {
            pageTitle.textContent = t.targets + ' | Домашняя бухгалтерия';
        }
        else if (pageTitle.textContent.includes('Операции') || pageTitle.textContent.includes('Operations')) {
            pageTitle.textContent = t.operations + ' | Домашняя бухгалтерия';
        }
        else if (pageTitle.textContent.includes('Настройки') || pageTitle.textContent.includes('Settings')) {
            pageTitle.textContent = t.settings + ' | Домашняя бухгалтерия';
        }
    }
    
    // Обновляем выбранный язык в селекте
    const langSelect = document.getElementById('language');
    if (langSelect) {
        langSelect.value = language;
    }
}

// Инициализация языка при загрузке
document.addEventListener('DOMContentLoaded', function() {
    applyLanguage();
    
    // Обработчик для динамического обновления
    document.addEventListener('click', function(e) {
        // Если элемент с data-i18n был добавлен динамически
        if (e.target && e.target.hasAttribute('data-i18n')) {
            const lang = localStorage.getItem('language') || 'ru';
            const key = e.target.getAttribute('data-i18n');
            e.target.textContent = getTranslation(key, lang);
        }
    });
});

// Экспорт функций
window.TranslationManager = {
    getTranslation,
    applyLanguage,
    translations
};