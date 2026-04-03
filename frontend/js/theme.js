// theme.js - управление темой для всех страниц
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация темы при загрузке страницы
    initTheme();
    
    // Обработчики для переключателей темы (если они есть на странице)
    initThemeControls();
});

function initTheme() {
    // Проверяем сохраненную тему
    const savedTheme = localStorage.getItem('theme') || 'light';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    console.log('🎨 Инициализация темы:', { savedTheme, prefersDark });
    
    // Применяем тему
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    } else if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
    } else if (savedTheme === 'auto') {
        // Автоопределение
        document.body.classList.toggle('dark-theme', prefersDark);
    }
    
    // Применяем сохраненный цвет акцента
    const savedColor = localStorage.getItem('accentColor') || '#4361ee';
    setAccentColor(savedColor);
}

function initThemeControls() {
    // Находим все переключатели темы
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    
    if (themeRadios.length === 0) {
        // Если на странице нет переключателей темы, ничего не делаем
        return;
    }
    
    console.log('🎨 Найдены переключатели темы:', themeRadios.length);
    
    // Устанавливаем текущую тему в радиокнопки
    const savedTheme = localStorage.getItem('theme') || 'light';
    themeRadios.forEach(radio => {
        radio.checked = (radio.value === savedTheme);
        
        radio.addEventListener('change', function() {
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
        });
    });
    
    // Обработчик для системной темы (если выбрано авто)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme === 'auto') {
            document.body.classList.toggle('dark-theme', e.matches);
        }
    });
}

// Обновленная функция установки акцентного цвета
function setAccentColor(color) {
    console.log('🎨 Установка акцентного цвета:', color);
    
    // Обновляем CSS переменные
    document.documentElement.style.setProperty('--primary-color', color);
    
    // Рассчитываем более темный оттенок для hover состояний
    const darkerColor = shadeColor(color, -20);
    document.documentElement.style.setProperty('--primary-dark', darkerColor);
    
    // Сохраняем для всех страниц
    localStorage.setItem('accentColor', color);
    
    // Обновляем цвет аватара с инициалами
    updateAvatarColor(color);
}

// Функция для затемнения/осветления цвета
function shadeColor(color, percent) {
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

// theme.js - добавить/обновить функцию updateAvatarColor
function updateAvatarColor(color) {
    console.log('🎨 Обновление цвета аватара:', color);
    
    // Создаем градиент из акцентного цвета
    const gradient = `linear-gradient(135deg, ${color} 0%, ${shadeColor(color, -30)} 100%)`;
    
    // Обновляем все аватары с инициалами
    const avatarElements = document.querySelectorAll('.avatar, .avatar-initials');
    
    avatarElements.forEach(element => {
        console.log('🎨 Обновляем элемент аватара:', element);
        element.style.background = gradient;
    });
    
    // Также обновляем все кружки с пользователями
    const userCircles = document.querySelectorAll('.user-circle, .user-initials, .avatar-circle');
    userCircles.forEach(circle => {
        if (circle.textContent.match(/^[А-ЯA-Z]{1,2}$/)) {
            circle.style.background = gradient;
        }
    });
}

// Вызываем обновление цвета аватара при инициализации темы
function initTheme() {
    // Проверяем сохраненную тему
    const savedTheme = localStorage.getItem('theme') || 'light';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    console.log('🎨 Инициализация темы:', { savedTheme, prefersDark });
    
    // Применяем тему
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    } else if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
    } else if (savedTheme === 'auto') {
        // Автоопределение
        document.body.classList.toggle('dark-theme', prefersDark);
    }
    
    // Применяем сохраненный цвет акцента
    const savedColor = localStorage.getItem('accentColor') || '#4361ee';
    setAccentColor(savedColor);
}

// Также вызываем обновление при клике на выбор цвета в настройках
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация темы
    initTheme();
    
    // Обработчики для переключателей темы
    initThemeControls();
    
    // Обработчики для выбора цвета
    initColorControls();
});

// Функция для инициализации контролов цвета
function initColorControls() {
    // Находим все элементы выбора цвета
    const colorOptions = document.querySelectorAll('.color-option');
    const customColorPicker = document.getElementById('customColor');
    
    if (colorOptions.length > 0) {
        colorOptions.forEach(option => {
            option.addEventListener('click', function() {
                const color = this.getAttribute('data-color');
                console.log('🎨 Выбран цвет:', color);
                setAccentColor(color);
                
                // Обновляем кастомный пикер
                if (customColorPicker) {
                    customColorPicker.value = color;
                }
            });
        });
    }
    
    if (customColorPicker) {
        customColorPicker.addEventListener('input', function() {
            console.log('🎨 Выбран кастомный цвет:', this.value);
            setAccentColor(this.value);
        });
    }
}

// Экспортируем функции для использования в других файлах
window.ThemeManager = {
    setAccentColor,
    initTheme
};

console.log('🎨 Theme script loaded');