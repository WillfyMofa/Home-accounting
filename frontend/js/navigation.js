// Простая логика для подсветки активной страницы
document.addEventListener('DOMContentLoaded', function() {
    // Получаем текущую страницу из URL
    const currentPage = window.location.pathname.split('/').pop() || 'main.html';
    
    // Находим все ссылки в навигации
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Убираем активный класс у всех ссылок
    navLinks.forEach(link => {
        link.classList.remove('active');
        
        // Сравниваем href ссылки с текущей страницей
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage || 
            (currentPage === '' && linkPage === 'main.html') ||
            (currentPage === 'main.html' && linkPage === '')) {
            link.classList.add('active');
        }
    });
    
    // Логика для вкладок на странице целей
    const tabButtons = document.querySelectorAll('.tab-btn');
    if (tabButtons.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Убираем активный класс у всех кнопок
                tabButtons.forEach(btn => btn.classList.remove('active'));
                // Добавляем активный класс нажатой кнопке
                this.classList.add('active');
            });
        });
    }
    
    // Логика для кнопки "Новая цель"
    const newTargetBtn = document.querySelector('.btn-primary[href="#"]');
    const targetForm = document.querySelector('.add-target-form');
    
    if (newTargetBtn && targetForm) {
        newTargetBtn.addEventListener('click', function(e) {
            e.preventDefault();
            targetForm.style.display = targetForm.style.display === 'none' ? 'block' : 'none';
        });
    }
});