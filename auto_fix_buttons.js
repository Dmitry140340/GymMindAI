import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 АВТОМАТИЧЕСКОЕ ИСПРАВЛЕНИЕ ОБНАРУЖЕННЫХ ПРОБЛЕМ\n');
console.log('=' .repeat(80) + '\n');

const handlersPath = path.join(__dirname, 'src', 'bot', 'handlers.js');
const keyboardsPath = path.join(__dirname, 'src', 'bot', 'keyboards.js');

// Читаем файлы
let handlersContent = fs.readFileSync(handlersPath, 'utf8');
let keyboardsContent = fs.readFileSync(keyboardsPath, 'utf8');

let changes = [];

// 1. Добавляем клавиатуру для успешной оплаты в keyboards.js
console.log('📝 Шаг 1: Добавление клавиатуры paymentSuccessKeyboard...');

const paymentSuccessKeyboard = `
// Клавиатура после успешной оплаты
export const paymentSuccessKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '🎉 Начать работу', callback_data: 'start_work' }
      ],
      [
        { text: '📊 Мой статус', callback_data: 'my_status' }
      ],
      [
        { text: '🏠 Главное меню', callback_data: 'main_menu' }
      ]
    ]
  }
};
`;

if (!keyboardsContent.includes('paymentSuccessKeyboard')) {
  // Добавляем в конец файла перед последней строкой
  const lines = keyboardsContent.split('\n');
  lines.splice(lines.length - 1, 0, paymentSuccessKeyboard);
  keyboardsContent = lines.join('\n');
  changes.push('✅ Добавлена клавиатура paymentSuccessKeyboard');
  console.log('   ✅ Клавиатура добавлена');
} else {
  console.log('   ⚠️  Клавиатура уже существует');
}

// 2. Добавляем обработчики в handlers.js
console.log('\n📝 Шаг 2: Добавление обработчиков callback-кнопок...');

const callbackHandlers = `
    // Обработка callback после оплаты - начать работу
    if (data === 'start_work') {
      try {
        await bot.deleteMessage(chatId, messageId).catch(() => {});
        await bot.sendMessage(
          chatId,
          '🎉 **Добро пожаловать!**\\n\\n' +
          'Теперь вам доступны все функции бота. Выберите действие:',
          { parse_mode: 'Markdown', ...mainKeyboard }
        );
        return;
      } catch (error) {
        console.error('Error in start_work handler:', error);
      }
    }

    // Обработка callback - показать статус подписки
    if (data === 'my_status') {
      try {
        const dbUser = await getUserByTelegramId(userId);
        const subscription = await getActiveSubscription(dbUser.id);
        
        let statusMessage = '📊 **Статус подписки**\\n\\n';
        
        if (subscription && subscription.status === 'active') {
          const endDate = new Date(subscription.end_date).toLocaleString('ru-RU');
          statusMessage += \`✅ **Активная подписка**\\n\`;
          statusMessage += \`📋 План: \${subscription.plan_type}\\n\`;
          statusMessage += \`📅 Действует до: \${endDate}\\n\`;
          statusMessage += \`🔄 Запросов использовано: \${subscription.requests_used}/\${subscription.requests_limit}\\n\`;
        } else {
          const freeRequests = await getUserFreeRequests(dbUser.id);
          statusMessage += \`❌ Нет активной подписки\\n\\n\`;
          statusMessage += \`🆓 Бесплатные запросы: \${freeRequests.used}/\${freeRequests.limit}\\n\\n\`;
          statusMessage += \`Для оформления подписки используйте кнопку "💎 Подписка"\`;
        }
        
        await bot.editMessageText(statusMessage, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
            ]
          }
        });
        return;
      } catch (error) {
        console.error('Error in my_status handler:', error);
      }
    }

    // Обработка выбора месячного тарифа
    if (data === 'pay_monthly') {
      try {
        await processPayment(bot, chatId, messageId, userId, 'monthly');
        return;
      } catch (error) {
        console.error('Error in pay_monthly handler:', error);
      }
    }

    // Обработка выбора квартального тарифа
    if (data === 'pay_quarterly') {
      try {
        await processPayment(bot, chatId, messageId, userId, 'quarterly');
        return;
      } catch (error) {
        console.error('Error in pay_quarterly handler:', error);
      }
    }

    // Обработка выбора годового тарифа
    if (data === 'pay_yearly') {
      try {
        await processPayment(bot, chatId, messageId, userId, 'yearly');
        return;
      } catch (error) {
        console.error('Error in pay_yearly handler:', error);
      }
    }

    // Обработка отмены платежа
    if (data === 'cancel_payment') {
      try {
        await bot.editMessageText(
          '❌ **Оплата отменена**\\n\\n' +
          'Вы можете вернуться к выбору плана подписки позже.',
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '💎 Выбрать план', callback_data: 'subscription_menu' }],
                [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
              ]
            }
          }
        );
        return;
      } catch (error) {
        console.error('Error in cancel_payment handler:', error);
      }
    }

`;

// Ищем место для вставки обработчиков (после обработки confirm_payment)
const insertPattern = /if \(data\.startsWith\('confirm_payment_'\)\) \{[\s\S]*?\n\s*\}/;
const match = handlersContent.match(insertPattern);

if (match && !handlersContent.includes("data === 'start_work'")) {
  const insertPosition = handlersContent.indexOf(match[0]) + match[0].length;
  handlersContent = 
    handlersContent.slice(0, insertPosition) + 
    callbackHandlers + 
    handlersContent.slice(insertPosition);
  
  changes.push('✅ Добавлены обработчики: start_work, my_status, pay_monthly, pay_quarterly, pay_yearly, cancel_payment');
  console.log('   ✅ Обработчики добавлены');
} else if (handlersContent.includes("data === 'start_work'")) {
  console.log('   ⚠️  Обработчики уже существуют');
} else {
  console.log('   ❌ Не удалось найти место для вставки обработчиков');
  console.log('   ℹ️  Требуется ручное добавление');
}

// 3. Обновляем экспорт в keyboards.js
console.log('\n📝 Шаг 3: Обновление экспорта клавиатур...');

if (!keyboardsContent.includes('export const paymentSuccessKeyboard') && 
    keyboardsContent.includes('paymentSuccessKeyboard')) {
  // Если клавиатура добавлена, но не экспортирована, это уже было сделано в шаге 1
  console.log('   ✅ Экспорт уже настроен');
}

// Сохраняем изменения
console.log('\n💾 Сохранение изменений...\n');

if (changes.length > 0) {
  // Создаем резервные копии
  const backupHandlers = handlersPath + '.backup';
  const backupKeyboards = keyboardsPath + '.backup';
  
  fs.copyFileSync(handlersPath, backupHandlers);
  fs.copyFileSync(keyboardsPath, backupKeyboards);
  
  console.log('📦 Резервные копии созданы:');
  console.log(`   - ${backupHandlers}`);
  console.log(`   - ${backupKeyboards}\n`);
  
  // Сохраняем изменения
  fs.writeFileSync(handlersPath, handlersContent, 'utf8');
  fs.writeFileSync(keyboardsPath, keyboardsContent, 'utf8');
  
  console.log('✅ Изменения успешно сохранены!\n');
  
  console.log('📋 Список изменений:');
  changes.forEach((change, index) => {
    console.log(`   ${index + 1}. ${change}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✨ ИСПРАВЛЕНИЯ ЗАВЕРШЕНЫ!\n');
  console.log('📝 Следующие шаги:');
  console.log('   1. Проверьте изменения в файлах handlers.js и keyboards.js');
  console.log('   2. Запустите бота: npm start');
  console.log('   3. Протестируйте все callback-кнопки вручную');
  console.log('   4. Если возникнут проблемы, используйте резервные копии');
  console.log('\n' + '='.repeat(80));
  
} else {
  console.log('ℹ️  Изменений не требуется - все обработчики уже существуют\n');
  console.log('='.repeat(80));
}

// Создаем отчет об исправлениях
const fixReport = `# Отчет об автоматических исправлениях

**Дата:** ${new Date().toLocaleString('ru-RU')}

## Внесенные изменения

${changes.length > 0 ? changes.map((c, i) => `${i + 1}. ${c}`).join('\n') : 'Изменений не требовалось'}

## Добавленные функции

### 1. paymentSuccessKeyboard
Клавиатура, отображаемая после успешной оплаты подписки.

**Кнопки:**
- 🎉 Начать работу (start_work)
- 📊 Мой статус (my_status)
- 🏠 Главное меню (main_menu)

### 2. Обработчики callback-кнопок

#### start_work
Обрабатывает переход к главному меню после оплаты подписки.

#### my_status
Показывает текущий статус подписки пользователя с деталями.

#### pay_monthly, pay_quarterly, pay_yearly
Обрабатывают выбор соответствующего тарифного плана.

#### cancel_payment
Обрабатывает отмену процесса оплаты.

## Файлы резервных копий

- \`src/bot/handlers.js.backup\`
- \`src/bot/keyboards.js.backup\`

## Рекомендации

1. Протестируйте все измененные функции
2. Проверьте работу платежной системы
3. Убедитесь в корректности навигации

## Откат изменений

Если потребуется откатить изменения:

\`\`\`bash
# Восстановление из резервных копий
cp src/bot/handlers.js.backup src/bot/handlers.js
cp src/bot/keyboards.js.backup src/bot/keyboards.js
\`\`\`
`;

fs.writeFileSync(
  path.join(__dirname, 'FIX_REPORT.md'),
  fixReport,
  'utf8'
);

console.log(`\n📄 Отчет об исправлениях сохранен: FIX_REPORT.md\n`);
