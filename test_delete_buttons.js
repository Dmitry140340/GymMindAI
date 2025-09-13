/**
 * Тест кнопок удаления - проверка работы всех кнопок удаления
 */

import { readFile } from 'fs/promises';

async function testDeleteButtons() {
  console.log('🧪 ТЕСТ КНОПОК УДАЛЕНИЯ\n');
  
  try {
    // Читаем keyboards.js для проверки кнопок
    const keyboardsContent = await readFile('src/bot/keyboards.js', 'utf8');
    console.log('✅ Файл keyboards.js прочитан');
    
    // Ищем кнопки удаления в keyboards.js
    const deleteButtons = [
      '🗑️ Удалить записи',
      '🗑️ Удалить тренировки', 
      '🗑️ Удалить веса',
      '🗑️ Удалить цели',
      '🗑️ Удалить всё'
    ];
    
    console.log('\n📋 ПРОВЕРКА КНОПОК В KEYBOARDS.JS:');
    for (const button of deleteButtons) {
      if (keyboardsContent.includes(button)) {
        console.log(`✅ ${button} - найдена`);
      } else {
        console.log(`❌ ${button} - НЕ НАЙДЕНА`);
      }
    }
    
    // Читаем handlers.js для проверки обработчиков
    const handlersContent = await readFile('src/bot/handlers.js', 'utf8');
    console.log('\n✅ Файл handlers.js прочитан');
    
    console.log('\n📋 ПРОВЕРКА ОБРАБОТЧИКОВ В HANDLERS.JS:');
    for (const button of deleteButtons) {
      if (handlersContent.includes(`if (text === '${button}')`) || 
          handlersContent.includes(`text === '${button}'`)) {
        console.log(`✅ ${button} - обработчик найден`);
      } else {
        console.log(`❌ ${button} - обработчик НЕ НАЙДЕН`);
      }
    }
    
    // Проверяем функции подтверждения
    const confirmFunctions = [
      'confirmDeleteAllGoals',
      'confirmDeleteAllData', 
      'processDeleteAllGoals',
      'processDeleteAllData'
    ];
    
    console.log('\n📋 ПРОВЕРКА ФУНКЦИЙ ПОДТВЕРЖДЕНИЯ:');
    for (const func of confirmFunctions) {
      if (handlersContent.includes(`function ${func}`) || 
          handlersContent.includes(`async function ${func}`)) {
        console.log(`✅ ${func} - функция найдена`);
      } else {
        console.log(`❌ ${func} - функция НЕ НАЙДЕНА`);
      }
    }
    
    // Проверяем команды подтверждения
    const confirmCommands = [
      'УДАЛИТЬ ВСЕ ТРЕНИРОВКИ',
      'УДАЛИТЬ ВСЕ ВЕСА',
      'УДАЛИТЬ ВСЕ ЦЕЛИ',
      'УДАЛИТЬ ВСЕ ДАННЫЕ'
    ];
    
    console.log('\n📋 ПРОВЕРКА КОМАНД ПОДТВЕРЖДЕНИЯ:');
    for (const command of confirmCommands) {
      if (handlersContent.includes(`'${command}'`)) {
        console.log(`✅ ${command} - команда найдена`);
      } else {
        console.log(`❌ ${command} - команда НЕ НАЙДЕНА`);
      }
    }
    
    // Проверяем состояния ожидания
    const waitingStates = [
      'waiting_confirm_delete_all_workouts',
      'waiting_confirm_delete_all_weights',
      'waiting_confirm_delete_all_goals',
      'waiting_confirm_delete_all_data'
    ];
    
    console.log('\n📋 ПРОВЕРКА СОСТОЯНИЙ ОЖИДАНИЯ:');
    for (const state of waitingStates) {
      if (handlersContent.includes(`'${state}'`)) {
        console.log(`✅ ${state} - состояние найдено`);
      } else {
        console.log(`❌ ${state} - состояние НЕ НАЙДЕНО`);
      }
    }
    
    // Читаем database.js для проверки функций БД
    const databaseContent = await readFile('src/services/database.js', 'utf8');
    console.log('\n✅ Файл database.js прочитан');
    
    const dbFunctions = [
      'deleteAllWorkouts',
      'deleteAllWeights', 
      'deleteAllGoals'
    ];
    
    console.log('\n📋 ПРОВЕРКА ФУНКЦИЙ БД:');
    for (const func of dbFunctions) {
      if (databaseContent.includes(`export async function ${func}`) ||
          databaseContent.includes(`function ${func}`)) {
        console.log(`✅ ${func} - функция найдена`);
      } else {
        console.log(`❌ ${func} - функция НЕ НАЙДЕНА`);
      }
    }
    
    // Проверяем импорты в handlers.js
    console.log('\n📋 ПРОВЕРКА ИМПОРТОВ В HANDLERS.JS:');
    for (const func of dbFunctions) {
      if (handlersContent.includes(func)) {
        console.log(`✅ ${func} - импорт найден`);
      } else {
        console.log(`❌ ${func} - импорт НЕ НАЙДЕН`);
      }
    }
    
    console.log('\n🎯 ИТОГОВОЕ РЕЗЮМЕ:');
    
    // Подсчет статистики
    let totalChecks = 0;
    let passedChecks = 0;
    
    // Кнопки в keyboards.js (5 кнопок)
    totalChecks += deleteButtons.length;
    for (const button of deleteButtons) {
      if (keyboardsContent.includes(button)) passedChecks++;
    }
    
    // Обработчики в handlers.js (5 обработчиков)
    totalChecks += deleteButtons.length;
    for (const button of deleteButtons) {
      if (handlersContent.includes(`text === '${button}'`)) passedChecks++;
    }
    
    // Функции подтверждения (4 функции)
    totalChecks += confirmFunctions.length;
    for (const func of confirmFunctions) {
      if (handlersContent.includes(`function ${func}`)) passedChecks++;
    }
    
    // Команды подтверждения (4 команды)
    totalChecks += confirmCommands.length;
    for (const command of confirmCommands) {
      if (handlersContent.includes(`'${command}'`)) passedChecks++;
    }
    
    // Состояния ожидания (4 состояния)
    totalChecks += waitingStates.length;
    for (const state of waitingStates) {
      if (handlersContent.includes(`'${state}'`)) passedChecks++;
    }
    
    // Функции БД (3 функции)
    totalChecks += dbFunctions.length;
    for (const func of dbFunctions) {
      if (databaseContent.includes(`function ${func}`)) passedChecks++;
    }
    
    // Импорты (3 импорта)
    totalChecks += dbFunctions.length;
    for (const func of dbFunctions) {
      if (handlersContent.includes(func)) passedChecks++;
    }
    
    const successRate = Math.round((passedChecks / totalChecks) * 100);
    
    if (successRate === 100) {
      console.log(`🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ! (${passedChecks}/${totalChecks})`);
      console.log('✅ Все кнопки удаления должны работать корректно');
    } else if (successRate >= 90) {
      console.log(`🟡 БОЛЬШИНСТВО ПРОВЕРОК ПРОЙДЕНЫ (${passedChecks}/${totalChecks} - ${successRate}%)`);
      console.log('⚠️ Возможны незначительные проблемы');
    } else {
      console.log(`🔴 НАЙДЕНЫ КРИТИЧЕСКИЕ ПРОБЛЕМЫ (${passedChecks}/${totalChecks} - ${successRate}%)`);
      console.log('❌ Требуется дополнительная отладка');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
}

// Запуск теста
testDeleteButtons();
