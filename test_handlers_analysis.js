// Тест реальных обработчиков из handlers.js
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Тестирование реальных обработчиков из handlers.js...');

// Проверка структуры handlers.js
import { readFileSync } from 'fs';

try {
  const handlersContent = readFileSync('./src/bot/handlers.js', 'utf8');
  
  console.log('📁 Файл handlers.js найден');
  
  // Ищем основные обработчики
  const handlerPatterns = [
    // Основные команды
    { pattern: /bot\.onText.*\/start/g, name: 'Команда /start' },
    { pattern: /bot\.onText.*\/help/g, name: 'Команда /help' },
    { pattern: /bot\.onText.*\/subscription/g, name: 'Команда /subscription' },
    { pattern: /bot\.onText.*\/profile/g, name: 'Команда /profile' },
    
    // Текстовые сообщения
    { pattern: /'🤖 ИИ-тренер'/g, name: 'Кнопка "ИИ-тренер"' },
    { pattern: /'🧬 ИИ-инструменты'/g, name: 'Кнопка "ИИ-инструменты"' },
    { pattern: /'💎 Подписка'/g, name: 'Кнопка "Подписка"' },
    { pattern: /'📊 Мой профиль'/g, name: 'Кнопка "Мой профиль"' },
    { pattern: /'📈 Аналитика'/g, name: 'Кнопка "Аналитика"' },
    { pattern: /'🎯 Мои данные'/g, name: 'Кнопка "Мои данные"' },
    { pattern: /'❓ Помощь'/g, name: 'Кнопка "Помощь"' },
    
    // Планы подписок
    { pattern: /'💎 Базовый план'/g, name: 'Базовый план' },
    { pattern: /'⭐ Стандартный план'/g, name: 'Стандартный план' },
    { pattern: /'🚀 Премиум план'/g, name: 'Премиум план' },
    
    // Платежи
    { pattern: /'💳 Оплатить сейчас'/g, name: 'Кнопка "Оплатить сейчас"' },
    
    // ИИ инструменты
    { pattern: /'🏋️‍♂️ \/training_program'/g, name: 'Программа тренировок' },
    { pattern: /'🥗 \/nutrition_plan'/g, name: 'План питания' },
    { pattern: /'🔬 \/deepresearch'/g, name: 'Глубокое исследование' },
    { pattern: /'🧪 \/composition_analysis'/g, name: 'Анализ состава' },
    
    // Данные пользователя
    { pattern: /'⚖️ Записать вес'/g, name: 'Записать вес' },
    { pattern: /'🎯 Установить цель'/g, name: 'Установить цель' },
    { pattern: /'🏋️‍♂️ Добавить тренировку'/g, name: 'Добавить тренировку' },
    { pattern: /'📊 Мои записи'/g, name: 'Мои записи' },
    
    // Аналитика
    { pattern: /'📈 График веса'/g, name: 'График веса' },
    { pattern: /'🏋️‍♂️ График тренировок'/g, name: 'График тренировок' },
    { pattern: /'📊 Общий отчет'/g, name: 'Общий отчет' },
    { pattern: /'🏆 Достижения'/g, name: 'Достижения' },
    
    // Callback обработчики
    { pattern: /bot\.on\('callback_query'/g, name: 'Callback query обработчик' },
    { pattern: /'accept_agreement'/g, name: 'Принятие соглашения' },
    { pattern: /'decline_agreement'/g, name: 'Отклонение соглашения' }
  ];
  
  console.log('\n🔍 Поиск обработчиков в коде...\n');
  
  let foundHandlers = 0;
  let totalHandlers = handlerPatterns.length;
  
  handlerPatterns.forEach((handler, index) => {
    const matches = handlersContent.match(handler.pattern);
    if (matches && matches.length > 0) {
      console.log(`✅ ${index + 1}. ${handler.name} - найден (${matches.length} совпадений)`);
      foundHandlers++;
    } else {
      console.log(`❌ ${index + 1}. ${handler.name} - не найден`);
    }
  });
  
  console.log(`\n📊 РЕЗУЛЬТАТЫ АНАЛИЗА ОБРАБОТЧИКОВ:`);
  console.log(`✅ Найдено: ${foundHandlers}/${totalHandlers}`);
  console.log(`📈 Процент покрытия: ${Math.round((foundHandlers / totalHandlers) * 100)}%`);
  
  // Дополнительная статистика
  const totalLines = handlersContent.split('\n').length;
  const importLines = (handlersContent.match(/import.*from/g) || []).length;
  const exportLines = (handlersContent.match(/export/g) || []).length;
  const functionLines = (handlersContent.match(/function|=>/g) || []).length;
  
  console.log(`\n📈 СТАТИСТИКА ФАЙЛА HANDLERS.JS:`);
  console.log(`📄 Общее количество строк: ${totalLines}`);
  console.log(`📦 Импорты: ${importLines}`);
  console.log(`📤 Экспорты: ${exportLines}`);
  console.log(`⚙️ Функции: ${functionLines}`);
  
  // Проверка основных функций
  const keyFunctions = [
    'setupBotHandlers',
    'handleMessage',
    'handleSubscription',
    'handlePayment',
    'handleAnalytics',
    'handleUserData'
  ];
  
  console.log(`\n🎯 ПРОВЕРКА КЛЮЧЕВЫХ ФУНКЦИЙ:`);
  keyFunctions.forEach((func, index) => {
    if (handlersContent.includes(func)) {
      console.log(`✅ ${index + 1}. ${func} - найдена`);
    } else {
      console.log(`⚠️ ${index + 1}. ${func} - не найдена (возможно другое название)`);
    }
  });
  
  if (foundHandlers >= totalHandlers * 0.8) {
    console.log('\n🎉 Обработчики кнопок реализованы достаточно полно!');
  } else if (foundHandlers >= totalHandlers * 0.6) {
    console.log('\n⚠️ Большинство обработчиков реализовано, но есть пробелы.');
  } else {
    console.log('\n❌ Многие обработчики кнопок не реализованы.');
  }
  
} catch (error) {
  console.error('❌ Ошибка при анализе handlers.js:', error.message);
}

console.log('\n🎯 Анализ обработчиков завершен!');
