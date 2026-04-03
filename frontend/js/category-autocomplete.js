console.log('📦 category-autocomplete.js загружается...');

class CategoryAutocomplete {
    constructor(inputElement, initialCategories = []) {
        this.input = inputElement;
        this.categories = initialCategories;
        this.container = null;
        this.suggestionsBox = null;
        this.selectedCategory = null;
        this.isTyping = false;
        
        this.init();
    }
    
    init() {
        console.log('🔧 Инициализация автодополнения категорий');
        
        // Создаем контейнер
        this.container = document.createElement('div');
        this.container.className = 'category-autocomplete-container';
        this.container.style.position = 'relative';
        
        // Вставляем контейнер после инпута
        this.input.parentNode.insertBefore(this.container, this.input.nextSibling);
        this.container.appendChild(this.input);
        
        // Создаем box для подсказок
        this.suggestionsBox = document.createElement('div');
        this.suggestionsBox.className = 'suggestions-box';
        this.suggestionsBox.style.display = 'none';
        this.container.appendChild(this.suggestionsBox);
        
        // События
        this.setupEvents();
        
        // Сохраняем в глобальную область
        window.categoryAutocomplete = this;
        
        console.log('✅ Автодополнение категорий инициализировано');
    }
    
    setupEvents() {
        // При вводе текста
        this.input.addEventListener('input', (e) => {
            this.isTyping = true;
            const value = e.target.value.trim();
            
            if (value.length >= 2) {
                this.showSuggestions(value);
            } else {
                this.hideSuggestions();
            }
        });
        
        // При фокусе
        this.input.addEventListener('focus', () => {
            if (this.input.value.trim().length >= 2) {
                this.showSuggestions(this.input.value.trim());
            }
        });
        
        // При потере фокуса
        this.input.addEventListener('blur', () => {
            setTimeout(() => {
                if (!this.isTyping) {
                    this.hideSuggestions();
                }
            }, 200);
        });
        
        // При нажатии клавиш
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideSuggestions();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (this.suggestionsBox.style.display === 'block') {
                    const firstItem = this.suggestionsBox.querySelector('.suggestion-item');
                    if (firstItem) {
                        this.selectSuggestion(firstItem);
                    }
                }
            }
        });
    }
    
    showSuggestions(searchText) {
        const lowerSearch = searchText.toLowerCase();
        
        // Фильтруем категории
        const filtered = this.categories.filter(cat => 
            cat.categoryname.toLowerCase().includes(lowerSearch)
        );
        
        // Если нет совпадений, показываем возможность создать новую
        if (filtered.length === 0 && searchText.length >= 2) {
            this.renderNewCategorySuggestion(searchText);
        } else if (filtered.length > 0) {
            this.renderExistingSuggestions(filtered, searchText);
        } else {
            this.hideSuggestions();
            return;
        }
        
        this.suggestionsBox.style.display = 'block';
        this.isTyping = false;
    }
    
    renderNewCategorySuggestion(searchText) {
        this.suggestionsBox.innerHTML = `
            <div class="suggestions-group">
                <div class="group-title">
                    <i class="fas fa-plus-circle"></i> Новая категория
                </div>
                <div class="suggestion-item new-category" data-name="${searchText}">
                    <i class="fas fa-plus"></i>
                    <strong>Создать: "${searchText}"</strong>
                    <span class="hint">Нажмите для создания новой категории</span>
                </div>
            </div>
        `;
        
        // Добавляем обработчик
        const newCategoryItem = this.suggestionsBox.querySelector('.new-category');
        newCategoryItem.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.input.value = searchText;
            this.hideSuggestions();
            this.input.focus();
            
            // Показываем подсказку
            this.showNewCategoryHint(searchText);
        });
    }
    
    renderExistingSuggestions(categories, searchText) {
        let html = '<div class="suggestions-group">';
        
        // Сначала показываем точные совпадения
        const exactMatches = categories.filter(cat => 
            cat.categoryname.toLowerCase() === searchText.toLowerCase()
        );
        
        const otherMatches = categories.filter(cat => 
            cat.categoryname.toLowerCase() !== searchText.toLowerCase()
        );
        
        if (exactMatches.length > 0) {
            html += `
                <div class="group-title">
                    <i class="fas fa-check-circle"></i> Точное совпадение
                </div>
            `;
            
            exactMatches.forEach(cat => {
                html += `
                    <div class="suggestion-item" data-id="${cat.categoryid}" data-name="${cat.categoryname}">
                        <i class="fas fa-folder"></i>
                        <span>${cat.categoryname}</span>

                    </div>
                `;
            });
        }
        
        if (otherMatches.length > 0) {
            html += `
                <div class="group-title">
                    <i class="fas fa-search"></i> Похожие категории
                </div>
            `;
            
            otherMatches.forEach(cat => {
                html += `
                    <div class="suggestion-item" data-id="${cat.categoryid}" data-name="${cat.categoryname}">
                        <i class="fas fa-folder"></i>
                        <span>${cat.categoryname}</span>

                    </div>
                `;
            });
        }
        
        // Добавляем возможность создать новую категорию
        html += `
            <div class="group-title">
                <i class="fas fa-plus-circle"></i> Создать новую
            </div>
            <div class="suggestion-item new-category" data-name="${searchText}">
                <i class="fas fa-plus"></i>
                <strong>Создать: "${searchText}"</strong>
                <span class="hint">Новая категория</span>
            </div>
        `;
        
        html += '</div>';
        this.suggestionsBox.innerHTML = html;
        
        // Добавляем обработчики для всех элементов
        this.suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                
                if (item.classList.contains('new-category')) {
                    const categoryName = item.getAttribute('data-name');
                    this.input.value = categoryName;
                    this.showNewCategoryHint(categoryName);
                } else {
                    const categoryId = item.getAttribute('data-id');
                    const categoryName = item.getAttribute('data-name');
                    
                    this.input.value = categoryName;
                    this.selectedCategory = {
                        id: categoryId,
                        name: categoryName
                    };
                    
                    // Показываем подсказку о существующей категории
                    this.showExistingCategoryHint(categoryName);
                }
                
                this.hideSuggestions();
                this.input.focus();
            });
        });
    }
    
    showNewCategoryHint(categoryName) {
        // Удаляем старую подсказку если есть
        const oldHint = this.container.querySelector('.category-hint');
        if (oldHint) oldHint.remove();
        
        // Создаем новую подсказку
        const hint = document.createElement('div');
        hint.className = 'category-hint new-category-hint';
        hint.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <span>Будет создана новая категория: <strong>"${categoryName}"</strong></span>
        `;
        
        this.container.appendChild(hint);
        
        // Удаляем подсказку через 5 секунд
        setTimeout(() => {
            if (hint.parentNode) {
                hint.remove();
            }
        }, 5000);
    }
    
    showExistingCategoryHint(categoryName) {
        // Удаляем старую подсказку если есть
        const oldHint = this.container.querySelector('.category-hint');
        if (oldHint) oldHint.remove();
        
        // Создаем новую подсказку
        const hint = document.createElement('div');
        hint.className = 'category-hint existing-category-hint';
        hint.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>Используется существующая категория: <strong>"${categoryName}"</strong></span>
        `;
        
        this.container.appendChild(hint);
        
        // Удаляем подсказку через 3 секунды
        setTimeout(() => {
            if (hint.parentNode) {
                hint.remove();
            }
        }, 3000);
    }
    
    hideSuggestions() {
        this.suggestionsBox.style.display = 'none';
    }
    
    selectSuggestion(item) {
        if (item.classList.contains('new-category')) {
            const categoryName = item.getAttribute('data-name');
            this.input.value = categoryName;
            this.showNewCategoryHint(categoryName);
        } else {
            const categoryId = item.getAttribute('data-id');
            const categoryName = item.getAttribute('data-name');
            
            this.input.value = categoryName;
            this.selectedCategory = {
                id: categoryId,
                name: categoryName
            };
            
            this.showExistingCategoryHint(categoryName);
        }
        
        this.hideSuggestions();
        this.input.focus();
    }
    
    getSelectedCategory() {
        if (this.selectedCategory && this.selectedCategory.name === this.input.value.trim()) {
            return this.selectedCategory;
        }
        
        // Проверяем, есть ли введенная категория в списке
        const inputValue = this.input.value.trim();
        const foundCategory = this.categories.find(cat => 
            cat.categoryname.toLowerCase() === inputValue.toLowerCase()
        );
        
        if (foundCategory) {
            return {
                id: foundCategory.categoryid,
                name: foundCategory.categoryname,
                isNew: false
            };
        }
        
        // Новая категория
        return {
            id: null,
            name: inputValue,
            isNew: true
        };
    }
    
    updateCategories(newCategories) {
        this.categories = newCategories;
        console.log('✅ Список категорий обновлен:', this.categories.length);
        
        // Если есть введенное значение, обновляем подсказки
        if (this.input.value.trim().length >= 2) {
            this.showSuggestions(this.input.value.trim());
        }
    }
}

// Добавляем стили для автодополнения
const addAutocompleteStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        .category-autocomplete-container {
            position: relative;
            width: 100%;
        }
        
        .suggestions-box {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            max-height: 300px;
            overflow-y: auto;
            background: white;
            border: 1px solid var(--border-color);
            border-top: none;
            border-radius: 0 0 var(--radius-md) var(--radius-md);
            box-shadow: var(--shadow-md);
            z-index: 1000;
        }
        
        .suggestions-group {
            padding: 5px 0;
        }
        
        .group-title {
            padding: 8px 15px;
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--gray-color);
            text-transform: uppercase;
            background-color: #f8f9fa;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .group-title i {
            font-size: 0.9rem;
        }
        
        .suggestion-item {
            padding: 12px 15px;
            cursor: pointer;
            transition: background-color 0.2s;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .suggestion-item:last-child {
            border-bottom: none;
        }
        
        .suggestion-item:hover {
            background-color: rgba(67, 97, 238, 0.1);
            color: var(--primary-color);
        }
        
        .suggestion-item i {
            width: 16px;
            text-align: center;
            color: var(--gray-color);
        }
        
        .suggestion-item:hover i {
            color: var(--primary-color);
        }
        
        .suggestion-item.new-category {
            color: var(--success-color);
        }
        
        .suggestion-item.new-category i {
            color: var(--success-color);
        }
        
        .category-type {
            margin-left: auto;
            font-size: 0.75rem;
            padding: 2px 8px;
            border-radius: 12px;
            font-weight: 500;
        }
        
        .category-type.income {
            background-color: rgba(46, 204, 113, 0.1);
            color: var(--success-color);
        }
        
        .category-type.expense {
            background-color: rgba(231, 76, 60, 0.1);
            color: var(--danger-color);
        }
        
        .category-hint {
            margin-top: 5px;
            padding: 8px 12px;
            border-radius: var(--radius-sm);
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: 8px;
            animation: fadeIn 0.3s ease;
        }
        
        .new-category-hint {
            background-color: rgba(46, 204, 113, 0.1);
            color: var(--success-color);
            border: 1px solid rgba(46, 204, 113, 0.2);
        }
        
        .existing-category-hint {
            background-color: rgba(67, 97, 238, 0.1);
            color: var(--primary-color);
            border: 1px solid rgba(67, 97, 238, 0.2);
        }
        
        .category-hint i {
            font-size: 0.9rem;
        }
        
        .hint {
            font-size: 0.8rem;
            color: var(--gray-color);
            margin-left: auto;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* Для темной темы */
        body.dark-theme .suggestions-box {
            background: #2d2d2d;
            border-color: #404040;
        }
        
        body.dark-theme .group-title {
            background-color: #3d3d3d;
            color: #b0b0b0;
        }
        
        body.dark-theme .suggestion-item {
            border-bottom-color: #404040;
        }
        
        body.dark-theme .suggestion-item:hover {
            background-color: rgba(67, 97, 238, 0.2);
        }
    `;
    
    document.head.appendChild(style);
};

// Инициализируем при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('📦 Инициализация CategoryAutocomplete...');
    
    // Добавляем стили
    addAutocompleteStyles();
    
    // Ищем поле категории
    const categoryInput = document.getElementById('category');
    
    if (categoryInput) {
        console.log('✅ Поле категории найдено');
        
        // Ждем немного чтобы категории успели загрузиться
        setTimeout(() => {
            const categories = window.categories || [];
            new CategoryAutocomplete(categoryInput, categories);
            console.log('✅ CategoryAutocomplete создан');
        }, 500);
    } else {
        console.log('⚠️ Поле категории не найдено');
    }
});

console.log('📦 CategoryAutocomplete класс определен');