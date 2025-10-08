/**
 * Комплексный тест всех кнопок в боте
 * Проверяет наличие обработчиков для каждой кнопки из keyboards.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Список всех кнопок из keyboards.js
const ALL_BUTTONS = {
  'Главное меню (mainKeyboard)': [
    '🤖 ИИ-тренер',
    '🧬 ИИ-инструменты',
    '💎 Подписка',
    '📊 Мой профиль',
    '📈 Аналитика',
    '🎯 Мои данные',
    '🔄 Новый диалог',
    '❓ Помощь'
  ],
  'Аналитика (analyticsKeyboard)': [
    '📈 График веса',
    '🏋️‍♂️ График тренировок',
    '📊 Общий отчет',
    '🏆 Достижения',
    '⬅️ Назад в меню'
  ],
  'Тренировки (workoutKeyboard)': [
    '💪 Силовая тренировка',
    '🏃‍♂️ Кардио',
    '🧘‍♀️ Йога/Растяжка',
    '🥊 Единоборства',
    '⬅️ Назад в меню'
  ],
  'Данные пользователя (userDataKeyboard)': [
    '⚖️ Записать вес',
    '🎯 Установить цель',
    '🏋️‍♂️ Добавить тренировку',
    '📊 Мои записи',
    '⬅️ Назад в меню'
  ],
  'Записи (recordsKeyboard)': [
    '🏋️‍♂️ История тренировок',
    '⚖️ История веса',
    '🎯 Мои цели',
    '📈 Прогресс',
    '🗑️ Удалить записи',
    '⬅️ Назад в меню'
  ],
  'Подписка (subscriptionKeyboard)': [
    '💳 Оплатить подписку',
    '📋 Статус подписки',
    '📊 История платежей',
    '⬅️ Назад в меню'
  ],
  'Планы подписки (subscriptionPlansKeyboard)': [
    '💎 Базовый план - 150₽',
    '⭐ Стандартный план - 300₽',
    '🚀 Премиум план - 450₽',
    '⬅️ Назад в меню'
  ],
  'Подтверждение оплаты (paymentConfirmKeyboard)': [
    '💳 Оплатить сейчас',
    '⬅️ Назад к планам',
    '⬅️ Назад в меню'
  ],
  'Помощь (helpKeyboard)': [
    '💬 Как пользоваться ботом?',
    '⚡ Что умеет ИИ-тренер?',
    '⬅️ Назад в меню'
  ],
  'ИИ-инструменты (aiToolsKeyboard)': [
    '/training_program',
    '/nutrition_plan',
    '/deepresearch',
    '/composition_analysis',
    '⬅️ Назад в меню'
  ],
  'Типы целей (goalTypesKeyboard)': [
    '🏋️‍♂️ Набрать мышечную массу',
    '⚖️ Снизить вес',
    '💪 Увеличить силу',
    '🏃‍♂️ Улучшить выносливость',
    '🤸‍♂️ Повысить гибкость',
    '⚡ Общая физподготовка',
    '❌ Отмена'
  ],
  'Удаление записей (deleteRecordsKeyboard)': [
    '🗑️ Удалить тренировки',
    '🗑️ Удалить веса',
    '🗑️ Удалить цели',
    '🗑️ Удалить всё',
    '❌ Отмена'
  ],
  'Навигация': [
    '⬅️ Назад в меню',
    '⬅️ Назад к планам',
    '⬅️ Назад к подписке',
    '🏠 Главное меню'
  ],
  'Callback кнопки (inline)': [
    'accept_agreement',
    'decline_agreement',
    'back_to_plans',
    'pay_monthly',
    'pay_quarterly',
    'pay_yearly',
    'confirm_payment',
    'cancel_payment'
  ]
};

console.log('🔍 КОМПЛЕКСНАЯ ПРОВЕРКА ОБРАБОТЧИКОВ КНОПОК\n');
console.log('='.repeat(60));

// Читаем файл handlers.js
const handlersPath = path.join(__dirname, 'src', 'bot', 'handlers.js');
const handlersContent = fs.readFileSync(handlersPath, 'utf8');

let totalButtons = 0;
let foundHandlers = 0;
let missingHandlers = [];

// Проверяем каждую категорию кнопок
for (const [category, buttons] of Object.entries(ALL_BUTTONS)) {
  console.log(`\n📋 ${category}:`);
  console.log('-'.repeat(60));
  
  for (const button of buttons) {
    totalButtons++;
    
    // Различная логика для разных типов кнопок
    let hasHandler = false;
    let handlerType = '';
    
    if (category === 'Callback кнопки (inline)') {
      // Для callback кнопок ищем case или if с callback_data
      const callbackPattern1 = new RegExp(`case '${button.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':`);
      const callbackPattern2 = new RegExp(`callbackQuery\\.data === '${button.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`);
      const callbackPattern3 = new RegExp(`data === '${button.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`);
      
      if (callbackPattern1.test(handlersContent) || 
          callbackPattern2.test(handlersContent) || 
          callbackPattern3.test(handlersContent)) {
        hasHandler = true;
        handlerType = 'callback_query';
      }
    } else if (button.startsWith('/')) {
      // Для команд ищем bot.onText или обработку команды
      const commandPattern1 = new RegExp(`bot\\.onText\\([^)]*${button.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      const commandPattern2 = new RegExp(`text === '${button.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`);
      const commandPattern3 = new RegExp(`text\\.startsWith\\('${button.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'\\)`);
      
      if (commandPattern1.test(handlersContent) || 
          commandPattern2.test(handlersContent) || 
          commandPattern3.test(handlersContent)) {
        hasHandler = true;
        handlerType = 'command';
      }
    } else {
      // Для обычных текстовых кнопок
      const escapedButton = button.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const textPattern1 = new RegExp(`text === '${escapedButton}'`);
      const textPattern2 = new RegExp(`text\\.includes\\('${escapedButton.split(' ')[0]}'\\)`);
      const textPattern3 = new RegExp(`text\\.includes\\('${escapedButton}'\\)`);
      
      if (textPattern1.test(handlersContent) || 
          textPattern2.test(handlersContent) || 
          textPattern3.test(handlersContent)) {
        hasHandler = true;
        handlerType = 'text message';
      }
    }
    
    if (hasHandler) {
      console.log(`  ✅ "${button}" - обработчик найден (${handlerType})`);
      foundHandlers++;
    } else {
      console.log(`  ❌ "${button}" - ОБРАБОТЧИК НЕ НАЙДЕН!`);
      missingHandlers.push({ category, button });
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log('\n📊 СТАТИСТИКА:');
console.log(`  Всего кнопок: ${totalButtons}`);
console.log(`  ✅ Найдено обработчиков: ${foundHandlers}`);
console.log(`  ❌ Отсутствуют обработчики: ${missingHandlers.length}`);
console.log(`  📈 Покрытие: ${((foundHandlers / totalButtons) * 100).toFixed(1)}%`);

if (missingHandlers.length > 0) {
  console.log('\n⚠️  ОТСУТСТВУЮЩИЕ ОБРАБОТЧИКИ:');
  console.log('='.repeat(60));
  
  for (const { category, button } of missingHandlers) {
    console.log(`  • [${category}] "${button}"`);
  }
  
  console.log('\n💡 РЕКОМЕНДАЦИИ:');
  console.log('  1. Добавьте обработчики для отсутствующих кнопок в handlers.js');
  console.log('  2. Или удалите неиспользуемые кнопки из keyboards.js');
  console.log('  3. Проверьте правильность написания кнопок в обоих файлах');
  
  process.exit(1);
} else {
  console.log('\n✅ ВСЕ КНОПКИ ИМЕЮТ ОБРАБОТЧИКИ!');
  console.log('   Бот готов к работе.');
  process.exit(0);
}
