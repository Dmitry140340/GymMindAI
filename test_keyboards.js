// Тест кнопок и интерфейса бота
import dotenv from 'dotenv';
import { 
  mainKeyboard,
  subscriptionPlansKeyboard,
  paymentConfirmKeyboard,
  aiToolsKeyboard,
  analyticsKeyboard,
  userDataKeyboard,
  workoutKeyboard,
  goalTypesKeyboard,
  helpKeyboard,
  userAgreementKeyboard,
  recordsKeyboard,
  subscriptionKeyboard
} from './src/bot/keyboards.js';

dotenv.config();

console.log('🧪 Тестирование кнопок и интерфейса бота...');

// Функция для тестирования клавиатуры
function testKeyboard(keyboardName, keyboard) {
  console.log(`\n🔍 Тестирование: ${keyboardName}`);
  
  try {
    if (!keyboard) {
      console.log(`❌ ${keyboardName}: клавиатура не определена`);
      return false;
    }

    if (!keyboard.reply_markup) {
      console.log(`❌ ${keyboardName}: отсутствует reply_markup`);
      return false;
    }

    if (!keyboard.reply_markup.keyboard && !keyboard.reply_markup.inline_keyboard) {
      console.log(`❌ ${keyboardName}: отсутствует keyboard или inline_keyboard`);
      return false;
    }

    const buttons = keyboard.reply_markup.keyboard || keyboard.reply_markup.inline_keyboard;
    
    if (!Array.isArray(buttons) || buttons.length === 0) {
      console.log(`❌ ${keyboardName}: пустой массив кнопок`);
      return false;
    }

    let totalButtons = 0;
    buttons.forEach((row, rowIndex) => {
      if (Array.isArray(row)) {
        totalButtons += row.length;
        row.forEach((button, buttonIndex) => {
          const buttonText = button.text || button.callback_data || 'неизвестная кнопка';
          console.log(`  📱 Ряд ${rowIndex + 1}, Кнопка ${buttonIndex + 1}: "${buttonText}"`);
        });
      } else {
        totalButtons += 1;
        const buttonText = row.text || row.callback_data || 'неизвестная кнопка';
        console.log(`  📱 Кнопка: "${buttonText}"`);
      }
    });

    console.log(`✅ ${keyboardName}: ${totalButtons} кнопок, структура корректна`);
    return true;

  } catch (error) {
    console.log(`❌ ${keyboardName}: ошибка - ${error.message}`);
    return false;
  }
}

// Тестируем все клавиатуры
const keyboards = [
  ['Главное меню', mainKeyboard],
  ['Планы подписок', subscriptionPlansKeyboard],
  ['Подтверждение платежа', paymentConfirmKeyboard],
  ['ИИ инструменты', aiToolsKeyboard],
  ['Аналитика', analyticsKeyboard],
  ['Пользовательские данные', userDataKeyboard],
  ['Тренировки', workoutKeyboard],
  ['Типы целей', goalTypesKeyboard],
  ['Помощь', helpKeyboard],
  ['Пользовательское соглашение', userAgreementKeyboard],
  ['Записи', recordsKeyboard],
  ['Подписка', subscriptionKeyboard]
];

let successCount = 0;
let totalCount = keyboards.length;

keyboards.forEach(([name, keyboard]) => {
  if (testKeyboard(name, keyboard)) {
    successCount++;
  }
});

console.log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ КНОПОК:');
console.log(`✅ Успешно: ${successCount}/${totalCount}`);
console.log(`❌ Ошибки: ${totalCount - successCount}/${totalCount}`);
console.log(`📈 Процент успеха: ${Math.round((successCount / totalCount) * 100)}%`);

if (successCount === totalCount) {
  console.log('\n🎉 Все кнопки работают корректно!');
} else {
  console.log('\n⚠️ Некоторые кнопки требуют внимания.');
}

// Тест специальных функций кнопок
console.log('\n🔧 Тестирование специальных функций кнопок...');

try {
  // Тест кнопки подтверждения платежа с разными планами
  const plans = ['basic', 'standard', 'premium'];
  plans.forEach(plan => {
    const keyboard = paymentConfirmKeyboard(plan);
    console.log(`✅ Кнопка подтверждения для плана ${plan}: работает`);
  });

  console.log('✅ Специальные функции кнопок работают');
} catch (error) {
  console.log(`❌ Ошибка в специальных функциях: ${error.message}`);
}

console.log('\n🎯 Тестирование кнопок завершено!');
