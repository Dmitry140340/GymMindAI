// Тест исправления кнопок удаления
// Проверяем что все кнопки удаления из deleteRecordsKeyboard имеют соответствующие обработчики

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Тестирование исправления кнопок удаления...\n');

// Читаем файлы
const keyboardsPath = path.join(__dirname, 'src', 'bot', 'keyboards.js');
const handlersPath = path.join(__dirname, 'src', 'bot', 'handlers.js');
const databasePath = path.join(__dirname, 'src', 'services', 'database.js');

try {
  const keyboardsContent = fs.readFileSync(keyboardsPath, 'utf8');
  const handlersContent = fs.readFileSync(handlersPath, 'utf8');
  const databaseContent = fs.readFileSync(databasePath, 'utf8');

  console.log('✅ Все файлы успешно прочитаны\n');

  // Извлекаем кнопки удаления из keyboards.js
  const deleteButtons = [];
  const deleteButtonsRegex = /🗑️[^'"]*/g;
  let match;
  
  while ((match = deleteButtonsRegex.exec(keyboardsContent)) !== null) {
    const buttonText = match[0].trim();
    if (!deleteButtons.includes(buttonText)) {
      deleteButtons.push(buttonText);
    }
  }

  console.log('🔍 Найденные кнопки удаления в keyboards.js:');
  deleteButtons.forEach(button => console.log(`  • ${button}`));
  console.log();

  // Проверяем наличие обработчиков для каждой кнопки
  const missingHandlers = [];
  const foundHandlers = [];

  deleteButtons.forEach(button => {
    const handlerPattern = new RegExp(`if\\s*\\(.*text\\s*===\\s*['"]${button.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s*\\)`, 'g');
    
    if (handlerPattern.test(handlersContent)) {
      foundHandlers.push(button);
    } else {
      missingHandlers.push(button);
    }
  });

  console.log('✅ Кнопки с найденными обработчиками:');
  foundHandlers.forEach(button => console.log(`  • ${button}`));
  console.log();

  if (missingHandlers.length > 0) {
    console.log('❌ Кнопки БЕЗ обработчиков:');
    missingHandlers.forEach(button => console.log(`  • ${button}`));
    console.log();
  } else {
    console.log('🎉 Все кнопки удаления имеют обработчики!\n');
  }

  // Проверяем наличие функций в database.js
  const requiredFunctions = [
    'deleteAllWorkouts',
    'deleteAllWeights', 
    'deleteAllGoals'
  ];

  console.log('🔍 Проверка функций в database.js:');
  requiredFunctions.forEach(func => {
    const funcPattern = new RegExp(`export\\s+async\\s+function\\s+${func}`, 'g');
    if (funcPattern.test(databaseContent)) {
      console.log(`  ✅ ${func} - найдена`);
    } else {
      console.log(`  ❌ ${func} - НЕ найдена`);
    }
  });

  console.log();

  // Проверяем импорты в handlers.js
  console.log('🔍 Проверка импортов в handlers.js:');
  requiredFunctions.forEach(func => {
    if (handlersContent.includes(func)) {
      console.log(`  ✅ ${func} - импортирована`);
    } else {
      console.log(`  ❌ ${func} - НЕ импортирована`);
    }
  });

  console.log();

  // Проверяем состояния пользователей для подтверждения удаления
  const requiredStates = [
    'waiting_confirm_delete_all_workouts',
    'waiting_confirm_delete_all_weights',
    'waiting_confirm_delete_all_goals', 
    'waiting_confirm_delete_all_data'
  ];

  console.log('🔍 Проверка состояний подтверждения удаления:');
  requiredStates.forEach(state => {
    if (handlersContent.includes(state)) {
      console.log(`  ✅ ${state} - найдено`);
    } else {
      console.log(`  ❌ ${state} - НЕ найдено`);
    }
  });

  console.log();

  // Проверяем команды подтверждения
  const confirmCommands = [
    'УДАЛИТЬ ВСЕ ТРЕНИРОВКИ',
    'УДАЛИТЬ ВСЕ ВЕСА',
    'УДАЛИТЬ ВСЕ ЦЕЛИ',
    'УДАЛИТЬ ВСЕ ДАННЫЕ'
  ];

  console.log('🔍 Проверка команд подтверждения:');
  confirmCommands.forEach(cmd => {
    if (handlersContent.includes(cmd)) {
      console.log(`  ✅ "${cmd}" - найдена`);
    } else {
      console.log(`  ❌ "${cmd}" - НЕ найдена`);
    }
  });

  console.log();

  // Итоговый результат
  const allChecksPassed = 
    missingHandlers.length === 0 &&
    requiredFunctions.every(func => databaseContent.includes(`export async function ${func}`)) &&
    requiredFunctions.every(func => handlersContent.includes(func)) &&
    requiredStates.every(state => handlersContent.includes(state)) &&
    confirmCommands.every(cmd => handlersContent.includes(cmd));

  if (allChecksPassed) {
    console.log('🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО!');
    console.log('✅ Кнопки удаления должны работать корректно');
  } else {
    console.log('⚠️ Найдены проблемы, требующие исправления');
  }

} catch (error) {
  console.error('❌ Ошибка при тестировании:', error.message);
}
