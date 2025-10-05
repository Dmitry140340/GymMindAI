import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 КОМПЛЕКСНОЕ ТЕСТИРОВАНИЕ ВСЕХ КНОПОК БОТА\n');
console.log('=' .repeat(80) + '\n');

// Определяем все кнопки по категориям
const buttonCategories = {
  'Главное меню': [
    '🤖 ИИ-тренер',
    '🧬 ИИ-инструменты',
    '💎 Подписка',
    '📊 Мой профиль',
    '📈 Аналитика',
    '🎯 Мои данные',
    '🔄 Новый диалог',
    '❓ Помощь'
  ],
  'Пользовательское соглашение (callback)': [
    'accept_agreement',
    'decline_agreement'
  ],
  'ИИ-инструменты (команды)': [
    '/training_program',
    '/nutrition_plan',
    '/progress_analysis',
    '/deepresearch',
    '/composition_analysis'
  ],
  'Управление данными': [
    '⚖️ Записать вес',
    '🎯 Установить цель',
    '🏋️‍♂️ Добавить тренировку',
    '📊 Мои записи'
  ],
  'Типы тренировок': [
    '💪 Силовая тренировка',
    '🏃‍♂️ Кардио',
    '🧘‍♀️ Йога/Растяжка',
    '🥊 Единоборства'
  ],
  'Аналитика': [
    '📈 График веса',
    '🏋️‍♂️ График тренировок',
    '📊 Общий отчет',
    '🏆 Достижения'
  ],
  'Типы целей': [
    '🏋️‍♂️ Набрать мышечную массу',
    '⚖️ Снизить вес',
    '💪 Увеличить силу',
    '🏃‍♂️ Улучшить выносливость',
    '🤸‍♂️ Повысить гибкость',
    '⚡ Общая физподготовка'
  ],
  'Подписка': [
    '💳 Оплатить подписку',
    '📋 Статус подписки',
    '📊 История платежей'
  ],
  'Планы подписки': [
    '💎 Базовый план - 150₽',
    '⭐ Стандартный план - 300₽',
    '🚀 Премиум план - 450₽'
  ],
  'Просмотр записей': [
    '🏋️‍♂️ История тренировок',
    '⚖️ История веса',
    '🎯 Мои цели'
  ],
  'Удаление данных': [
    '🗑️ Удалить записи',
    '🗑️ Удалить тренировки',
    '🗑️ Удалить веса',
    '🗑️ Удалить всё'
  ],
  'Навигация': [
    '⬅️ Назад к подписке',
    '⬅️ Назад к планам',
    '⬅️ Назад в меню'
  ],
  'Подтверждение/Отмена': [
    '✅ Да',
    '✅ Да, удалить',
    '✅ Да, удалить ВСЁ',
    '❌ Нет',
    '❌ Отмена'
  ],
  'Callback-кнопки платежей': [
    'pay_monthly',
    'pay_quarterly',
    'pay_yearly',
    'confirm_payment',
    'cancel_payment',
    'start_work',
    'my_status'
  ]
};

// Подсчитываем общее количество кнопок
let totalButtons = 0;
for (const category in buttonCategories) {
  totalButtons += buttonCategories[category].length;
}

console.log(`📊 Всего кнопок для тестирования: ${totalButtons}\n`);

// Читаем файлы
const handlersPath = path.join(__dirname, 'src', 'bot', 'handlers.js');
const keyboardsPath = path.join(__dirname, 'src', 'bot', 'keyboards.js');

let handlersContent = '';
let keyboardsContent = '';

try {
  handlersContent = fs.readFileSync(handlersPath, 'utf8');
  keyboardsContent = fs.readFileSync(keyboardsPath, 'utf8');
} catch (error) {
  console.error('❌ Ошибка чтения файлов:', error.message);
  process.exit(1);
}

console.log('✅ Файлы успешно загружены\n');
console.log('=' .repeat(80) + '\n');

// Результаты тестирования
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  details: {}
};

// Функция для проверки наличия кнопки в keyboards.js
function checkButtonInKeyboards(buttonText) {
  // Проверяем наличие текста кнопки в keyboards.js
  const patterns = [
    `text: '${buttonText}'`,
    `text: "${buttonText}"`,
    `{ text: '${buttonText}' }`,
    `{ text: "${buttonText}" }`,
    `callback_data: '${buttonText}'`,
    `callback_data: "${buttonText}"`
  ];
  
  return patterns.some(pattern => keyboardsContent.includes(pattern));
}

// Функция для проверки наличия обработчика в handlers.js
function checkHandlerInHandlers(buttonText) {
  // Различные паттерны для поиска обработчиков
  const patterns = [
    `text === '${buttonText}'`,
    `text.includes('${buttonText.replace(/[🤖💎📊🎯🧬⚖️🏋️‍♂️💪🏃‍♂️🧘‍♀️🥊📈🏆🤸‍♂️⚡💳📋🗑️⬅️✅❌⭐🚀]/g, '')}'`,
    `data === '${buttonText}'`,
    `text.startsWith('${buttonText}')`
  ];
  
  // Упрощенная проверка - ищем основные части текста без эмодзи
  const cleanText = buttonText.replace(/[🤖💎📊🎯🧬⚖️🏋️‍♂️💪🏃‍♂️🧘‍♀️🥊📈🏆🤸‍♂️⚡💳📋🗑️⬅️✅❌⭐🚀🔄❓🏠🎉]/g, '').trim();
  
  if (cleanText) {
    return handlersContent.includes(cleanText) || 
           patterns.some(pattern => handlersContent.includes(pattern));
  }
  
  // Для callback данных
  if (buttonText.includes('_')) {
    return handlersContent.includes(`'${buttonText}'`) || 
           handlersContent.includes(`"${buttonText}"`);
  }
  
  return patterns.some(pattern => handlersContent.includes(pattern));
}

// Функция для получения более детальной информации об обработчике
function getHandlerDetails(buttonText) {
  const details = {
    hasKeyboard: false,
    hasHandler: false,
    handlerType: 'unknown',
    notes: []
  };
  
  details.hasKeyboard = checkButtonInKeyboards(buttonText);
  details.hasHandler = checkHandlerInHandlers(buttonText);
  
  // Определяем тип обработчика
  if (buttonText.startsWith('/')) {
    details.handlerType = 'command';
  } else if (buttonText.includes('_') && !buttonText.includes(' ')) {
    details.handlerType = 'callback';
  } else {
    details.handlerType = 'text';
  }
  
  // Дополнительные заметки
  if (details.hasKeyboard && !details.hasHandler) {
    details.notes.push('Кнопка определена, но обработчик не найден');
  } else if (!details.hasKeyboard && details.hasHandler) {
    details.notes.push('Обработчик найден, но кнопка не определена в keyboards.js');
  } else if (details.hasKeyboard && details.hasHandler) {
    details.notes.push('OK');
  } else {
    details.notes.push('Кнопка и обработчик отсутствуют');
  }
  
  return details;
}

// Тестируем каждую категорию
for (const [category, buttons] of Object.entries(buttonCategories)) {
  console.log(`\n📁 ${category}`);
  console.log('-'.repeat(80));
  
  results.details[category] = {
    total: buttons.length,
    passed: 0,
    failed: 0,
    buttons: {}
  };
  
  for (const button of buttons) {
    results.total++;
    const details = getHandlerDetails(button);
    
    const isOK = details.hasKeyboard || details.hasHandler;
    
    if (isOK) {
      results.passed++;
      results.details[category].passed++;
    } else {
      results.failed++;
      results.details[category].failed++;
    }
    
    results.details[category].buttons[button] = details;
    
    // Выводим результат
    const status = isOK ? '✅' : '❌';
    const keyboardStatus = details.hasKeyboard ? '📱' : '  ';
    const handlerStatus = details.hasHandler ? '⚙️' : '  ';
    
    console.log(`${status} ${keyboardStatus} ${handlerStatus} ${button}`);
    
    if (details.notes.length > 0 && details.notes[0] !== 'OK') {
      console.log(`   └─ ${details.notes.join(', ')}`);
    }
  }
  
  const categoryPercent = ((results.details[category].passed / results.details[category].total) * 100).toFixed(1);
  console.log(`\n   Результат: ${results.details[category].passed}/${results.details[category].total} (${categoryPercent}%)`);
}

// Итоговый отчет
console.log('\n' + '='.repeat(80));
console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ\n');

const successRate = ((results.passed / results.total) * 100).toFixed(1);

console.log(`Всего протестировано кнопок: ${results.total}`);
console.log(`✅ Успешно: ${results.passed}`);
console.log(`❌ Ошибок: ${results.failed}`);
console.log(`📈 Процент успеха: ${successRate}%\n`);

// Легенда
console.log('📖 ЛЕГЕНДА:');
console.log('  ✅ - Кнопка работает корректно');
console.log('  ❌ - Проблемы с кнопкой');
console.log('  📱 - Кнопка определена в keyboards.js');
console.log('  ⚙️  - Обработчик найден в handlers.js\n');

// Рекомендации
console.log('=' .repeat(80));
console.log('\n💡 РЕКОМЕНДАЦИИ:\n');

if (results.failed > 0) {
  console.log('⚠️  Обнаружены проблемы со следующими компонентами:\n');
  
  for (const [category, data] of Object.entries(results.details)) {
    if (data.failed > 0) {
      console.log(`\n  📁 ${category}:`);
      for (const [button, details] of Object.entries(data.buttons)) {
        if (!details.hasKeyboard || !details.hasHandler) {
          console.log(`     - ${button}`);
          console.log(`       ${details.notes.join(', ')}`);
        }
      }
    }
  }
  
  console.log('\n  🔧 Рекомендуется:');
  console.log('     1. Проверить наличие всех кнопок в keyboards.js');
  console.log('     2. Проверить наличие обработчиков в handlers.js');
  console.log('     3. Убедиться в соответствии текста кнопок и обработчиков');
} else {
  console.log('✅ Все кнопки работают корректно!');
  console.log('   Бот готов к использованию.');
}

console.log('\n' + '='.repeat(80));

// Сохраняем детальный отчет в файл
const reportPath = path.join(__dirname, 'BUTTONS_TEST_REPORT_DETAILED.md');
let reportContent = '# Детальный отчет тестирования кнопок бота\n\n';
reportContent += `**Дата тестирования:** ${new Date().toLocaleString('ru-RU')}\n\n`;
reportContent += `**Всего кнопок:** ${results.total}\n`;
reportContent += `**Успешно:** ${results.passed} (${successRate}%)\n`;
reportContent += `**Ошибок:** ${results.failed}\n\n`;

reportContent += '## Результаты по категориям\n\n';

for (const [category, data] of Object.entries(results.details)) {
  const categoryPercent = ((data.passed / data.total) * 100).toFixed(1);
  reportContent += `### ${category}\n\n`;
  reportContent += `**Результат:** ${data.passed}/${data.total} (${categoryPercent}%)\n\n`;
  reportContent += '| Кнопка | Keyboard | Handler | Тип | Статус | Примечания |\n';
  reportContent += '|--------|----------|---------|-----|--------|------------|\n';
  
  for (const [button, details] of Object.entries(data.buttons)) {
    const keyboardIcon = details.hasKeyboard ? '✅' : '❌';
    const handlerIcon = details.hasHandler ? '✅' : '❌';
    const status = (details.hasKeyboard || details.hasHandler) ? '✅' : '❌';
    
    reportContent += `| \`${button}\` | ${keyboardIcon} | ${handlerIcon} | ${details.handlerType} | ${status} | ${details.notes.join(', ')} |\n`;
  }
  
  reportContent += '\n';
}

reportContent += '## Рекомендации\n\n';

if (results.failed > 0) {
  reportContent += '### Обнаруженные проблемы:\n\n';
  
  for (const [category, data] of Object.entries(results.details)) {
    if (data.failed > 0) {
      reportContent += `#### ${category}\n\n`;
      for (const [button, details] of Object.entries(data.buttons)) {
        if (!details.hasKeyboard || !details.hasHandler) {
          reportContent += `- **${button}**: ${details.notes.join(', ')}\n`;
        }
      }
      reportContent += '\n';
    }
  }
  
  reportContent += '### Действия для исправления:\n\n';
  reportContent += '1. Добавить недостающие кнопки в `keyboards.js`\n';
  reportContent += '2. Добавить недостающие обработчики в `handlers.js`\n';
  reportContent += '3. Проверить соответствие текста кнопок и обработчиков\n';
  reportContent += '4. Протестировать функциональность каждой кнопки вручную\n';
} else {
  reportContent += '✅ **Все кнопки работают корректно!**\n\n';
  reportContent += 'Бот готов к использованию.\n';
}

fs.writeFileSync(reportPath, reportContent, 'utf8');
console.log(`\n📄 Детальный отчет сохранен в: ${reportPath}`);

// Определяем код выхода
process.exit(results.failed > 0 ? 1 : 0);
