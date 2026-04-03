// js/login.js
document.addEventListener('DOMContentLoaded', function() {
    const API_URL = 'http://localhost:3000/api';
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const login = document.getElementById('login').value;
        const password = document.getElementById('password').value;
        const submitBtn = this.querySelector('button[type="submit"]');
        
        // Валидация
        if (!login || !password) {
            alert('Заполните все поля');
            return;
        }
        
        // Показываем загрузку
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
        
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ login, password })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Сохраняем токен и данные пользователя
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                
                // Перенаправляем на главную
                window.location.href = 'main.html';
            } else {
                alert(result.error || 'Ошибка входа');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (error) {
            console.error('Ошибка входа:', error);
            alert('Ошибка подключения к серверу');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});