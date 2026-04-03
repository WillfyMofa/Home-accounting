function showError(message) {
    console.error('❌ Ошибка:', message);
    
    // Простое уведомление
    if (typeof alert !== 'undefined') {
        alert('Ошибка: ' + message);
    }
}

function showSuccess(message) {
    console.log('✅ Успех:', message);
    
    if (typeof alert !== 'undefined') {
        alert('Успех: ' + message);
    }
}

console.log('📦 modal-manager.js загружается...');

class ModalManager {
    constructor() {
        console.log('🚀 Конструктор ModalManager вызван');
        
        this.initModals();
    }
    
    initModals() {
        console.log('🔧 Настройка модальных окон...');
        
        // Получаем элементы
        this.editModal = document.getElementById('editModal');
        this.deleteModal = document.getElementById('deleteModal');
        this.editForm = document.getElementById('editForm');
        
        if (!this.editModal || !this.deleteModal) {
            console.error('❌ Модальные окна не найдены в DOM');
            return;
        }
        
        console.log('✅ Модальные окна найдены');
        
        // Настраиваем закрытие по клику на фон
        [this.editModal, this.deleteModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });
        
        // Настраиваем закрытие по кнопке X
        document.querySelectorAll('.modal-close, .close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                if (closeBtn.closest('#editModal')) {
                    this.closeModal(this.editModal);
                } else if (closeBtn.closest('#deleteModal')) {
                    this.closeModal(this.deleteModal);
                }
            });
        });
        
        // Настраиваем кнопки отмены
        const cancelEdit = document.getElementById('cancelEdit');
        const cancelDelete = document.getElementById('cancelDelete');
        
        if (cancelEdit) {
            cancelEdit.addEventListener('click', () => this.closeModal(this.editModal));
        }
        
        if (cancelDelete) {
            cancelDelete.addEventListener('click', () => this.closeModal(this.deleteModal));
        }
        
        // Настраиваем форму редактирования
        if (this.editForm) {
            this.editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEditSubmit();
            });
        }
        
        // Настраиваем кнопку подтверждения удаления
        const confirmDelete = document.getElementById('confirmDelete');
        if (confirmDelete) {
            confirmDelete.addEventListener('click', () => this.handleDelete());
        }
        
        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        console.log('✅ ModalManager инициализирован');
    }
    
    // Открытие модального окна редактирования
    openEditModal(operationId) {
        console.log('📝 Открытие редактора для операции:', operationId);
        console.log('🕒 Время вызова:', new Date().toISOString());
        
        // Проверка 1: Есть ли операции в window
        if (!window.operations || !Array.isArray(window.operations)) {
            console.warn('⚠️ window.operations не определен или не массив');
            showError('Операции еще не загружены. Попробуйте через секунду.');
            return;
        }
        
        // Проверка 2: Есть ли операции в массиве?
        if (window.operations.length === 0) {
            console.warn('⚠️ window.operations пустой массив');
            showError('Нет операций для редактирования');
            return;
        }
        
        console.log('📊 Операций доступно:', window.operations.length);
        
        // Поиск операции
        let operation = null;
        const searchId = operationId.toString();
        
        for (let i = 0; i < window.operations.length; i++) {
            const op = window.operations[i];
            if (!op) continue;
            
            // Проверяем все возможные поля ID
            const possibleIds = [
                op.id,
                op.storyrecordid,
                op.storyRecordId,
                op.recordId,
                op.operationId
            ];
            
            for (const id of possibleIds) {
                if (id && id.toString() === searchId) {
                    operation = op;
                    console.log('✅ Найдено совпадение по полю:', Object.keys(op).find(k => op[k] === id));
                    break;
                }
            }
            
            if (operation) break;
        }
        
        if (!operation) {
            console.error('❌ Операция не найдена. Искали:', searchId);
            showError(`Операция ${operationId} не найдена`);
            return;
        }
        
        console.log('✅ Операция найдена:', {
            id: operation.id,
            storyrecordid: operation.storyrecordid,
            amount: operation.amount,
            category: operation.categoryname
        });
        
        this.fillEditForm(operation);
        this.showModal(this.editModal);
    }
    
    // Заполнение формы редактирования
    fillEditForm(operation) {
        console.log('📋 Заполнение формы данными:', operation);
        
        // ID операции
        document.getElementById('editId').value = operation.id || operation.storyrecordid;
        
        // Тип операции
        document.getElementById('editType').value = operation.isincome ? 'true' : 'false';
        
        // Сумма
        document.getElementById('editAmount').value = operation.amount || 0;
        
        // Категория
        const categoryInput = document.getElementById('editCategory');
        if (categoryInput) {
            categoryInput.value = operation.categoryname || '';
            if (operation.categoryid) {
                categoryInput.setAttribute('data-category-id', operation.categoryid);
            }
        }
        
        // Дата
        const dateInput = document.getElementById('editDate');
        if (dateInput && operation.operationdate) {
            // Форматируем дату для input type="date" (YYYY-MM-DD)
            const date = new Date(operation.operationdate);
            const formattedDate = date.toISOString().split('T')[0];
            dateInput.value = formattedDate;
        }
        
        // Описание
        document.getElementById('editDescription').value = operation.description || '';
    }
    
    // Открытие модального окна удаления
    openDeleteModal(operationId) {
        console.log('🗑️ Открытие удаления для операции:', operationId);
        
        if (!window.operations || !Array.isArray(window.operations)) {
            showError('Операции не загружены');
            return;
        }
        
        // Находим операцию
        let operation = null;
        for (let i = 0; i < window.operations.length; i++) {
            const op = window.operations[i];
            if (!op) continue;
            
            const opId = op.id ? op.id.toString() : '';
            const opStoryId = op.storyrecordid ? op.storyrecordid.toString() : '';
            const searchId = operationId.toString();
            
            if (opId === searchId || opStoryId === searchId) {
                operation = op;
                break;
            }
        }
        
        if (!operation) {
            console.error('❌ Операция не найдена:', operationId);
            showError('Операция не найдена');
            return;
        }
        
        // Заполняем информацию об операции
        this.fillDeleteInfo(operation);
        
        // Сохраняем ID для удаления
        this.operationToDelete = operationId;
        
        // Показываем модальное окно
        this.showModal(this.deleteModal);
    }
    
    // Заполнение информации об удаляемой операции
    fillDeleteInfo(operation) {
        const infoContainer = document.querySelector('#deleteModal .operation-info');
        if (!infoContainer) return;
        
        const date = operation.operationdate ? 
            new Date(operation.operationdate).toLocaleDateString('ru-RU') : 
            'Не указана';
        
        const amount = operation.amount ? 
            parseFloat(operation.amount).toLocaleString('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) : '0.00';
        
        infoContainer.innerHTML = `
            <p><strong>Дата:</strong> ${date}</p>
            <p><strong>Тип:</strong> ${operation.isincome ? 'Доход' : 'Расход'}</p>
            <p><strong>Категория:</strong> ${operation.categoryname || 'Без категории'}</p>
            <p><strong>Сумма:</strong> ${operation.isincome ? '+' : '-'}${amount} ₽</p>
            <p><strong>Описание:</strong> ${operation.description || '—'}</p>
        `;
    }
    
    // Показать модальное окно
    showModal(modal) {
        if (!modal) return;
        
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        document.body.style.overflow = 'hidden';
    }
    
    // Закрыть модальное окно
    closeModal(modal) {
        if (!modal) return;
        
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }
    
    // Закрыть все модальные окна
    closeAllModals() {
        this.closeModal(this.editModal);
        this.closeModal(this.deleteModal);
    }
    
    // Обработка отправки формы редактирования
    async handleEditSubmit() {
        console.log('📤 Отправка формы редактирования');
        
        // Получаем данные из формы
        const formData = {
            id: document.getElementById('editId').value,
            isIncome: document.getElementById('editType').value === 'true',
            amount: parseFloat(document.getElementById('editAmount').value),
            operationDate: document.getElementById('editDate').value || new Date().toISOString().split('T')[0],
            description: document.getElementById('editDescription').value.trim(),
            categoryId: document.getElementById('editCategory').getAttribute('data-category-id') || null
        };
        
        // Валидация
        if (!formData.amount || formData.amount <= 0) {
            showError('Введите корректную сумму');
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/operations/${formData.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                showSuccess('Операция успешно обновлена!');
                this.closeModal(this.editModal);
                
                // Перезагружаем операции
                if (window.loadOperations) {
                    await window.loadOperations();
                }
            } else {
                showError(data.error || 'Ошибка при обновлении операции');
            }
        } catch (error) {
            console.error('❌ Ошибка обновления операции:', error);
            showError('Не удалось обновить операцию');
        }
    }
    
    // Обработка удаления
    async handleDelete() {
        if (!this.operationToDelete) return;
        
        console.log('🗑️ Удаление операции:', this.operationToDelete);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/operations/${this.operationToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                showSuccess('Операция успешно удалена!');
                this.closeModal(this.deleteModal);
                
                // Перезагружаем операции
                if (window.loadOperations) {
                    await window.loadOperations();
                }
            } else {
                showError(data.error || 'Ошибка при удалении операции');
            }
        } catch (error) {
            console.error('❌ Ошибка удаления операции:', error);
            showError('Не удалось удалить операцию');
        }
    }
}

console.log('📦 ModalManager класс определен');

// Создаем экземпляр ModalManager сразу после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('📦 DOM загружен, создаем ModalManager...');
    
    try {
        window.modalManager = new ModalManager();
        console.log('✅ ModalManager создан и сохранен в window.modalManager');
        
        // Сообщаем о готовности
        window.dispatchEvent(new CustomEvent('modalManagerReady'));
    } catch (error) {
        console.error('❌ Ошибка создания ModalManager:', error);
    }
});

// Добавляем глобальные функции для кнопок в таблице
window.editOperation = function(id) {
    console.log('✏️ Вызов редактирования для операции:', id);
    console.log('window.modalManager:', window.modalManager);
    
    if (window.modalManager) {
        window.modalManager.openEditModal(id);
    } else {
        console.error('❌ ModalManager не доступен');
        showError('Системная ошибка. Попробуйте обновить страницу.');
    }
};

window.deleteOperation = function(id) {
    console.log('🗑️ Вызов удаления для операции:', id);
    
    if (window.modalManager) {
        window.modalManager.openDeleteModal(id);
    } else {
        console.error('❌ ModalManager не доступен');
        showError('Системная ошибка. Попробуйте обновить страницу.');
    }
};