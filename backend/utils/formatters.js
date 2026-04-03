// utils/formatters.js

/**
 * Форматирует категорию операции
 * @param {Object} operation - Объект операции
 * @returns {Object} Форматированная категория
 */
export function formatOperationCategory(operation) {
    if (!operation) return { displayName: 'Нет данных' };
    
    // Если категория есть в объекте категории
    if (operation.category && operation.category.name) {
        return {
            ...operation.category,
            displayName: operation.category.name,
            hasCategory: true
        };
    }
    
    // Если категория пришла как отдельное поле (старая структура)
    if (operation.categoryName && operation.categoryName !== 'null') {
        return {
            id: operation.categoryId,
            name: operation.categoryName,
            displayName: operation.categoryName,
            hasCategory: true
        };
    }
    
    // Если категории нет
    return {
        id: null,
        name: null,
        displayName: 'Нет категории',
        hasCategory: false,
        isUncategorized: true
    };
}

/**
 * Форматирует полную операцию для отображения
 */
export function formatOperationForDisplay(operation) {
    const category = formatOperationCategory(operation);
    
    return {
        ...operation,
        category: category,
        displayCategory: category.displayName,
        formattedAmount: new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB'
        }).format(operation.amount),
        formattedDate: new Date(operation.operationDate).toLocaleDateString('ru-RU'),
        type: operation.isIncome ? 'income' : 'expense',
        typeText: operation.isIncome ? 'Доход' : 'Расход'
    };
}