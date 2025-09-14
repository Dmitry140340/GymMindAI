import { initDatabase, updateUserSubscription, getActiveSubscription } from './src/services/database.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => {
  return new Promise(resolve => rl.question(query, resolve));
};

const fixExistingPayments = async () => {
  console.log('🔧 Скрипт исправления существующих платежей\n');

  try {
    // Инициализируем базу данных
    await initDatabase();
    console.log('✅ База данных подключена\n');

    console.log('📋 Для исправления доступа нужны данные о пользователях:');
    console.log('   - Telegram ID пользователя');
    console.log('   - Тип оплаченного плана (basic/standard/premium)');
    console.log('   - ID платежа (опционально)\n');

    const users = [];
    
    while (true) {
      const telegramId = await question('Введите Telegram ID пользователя (или "stop" для завершения): ');
      
      if (telegramId.toLowerCase() === 'stop') {
        break;
      }

      if (!telegramId || isNaN(telegramId)) {
        console.log('❌ Некорректный Telegram ID\n');
        continue;
      }

      // Проверяем существующую подписку
      const existingSubscription = await getActiveSubscription(parseInt(telegramId));
      
      if (existingSubscription) {
        console.log(`✅ У пользователя ${telegramId} уже есть активная подписка:`);
        console.log(`   План: ${existingSubscription.plan_type}`);
        console.log(`   До: ${new Date(existingSubscription.end_date).toLocaleString('ru-RU')}`);
        console.log(`   Лимит: ${existingSubscription.requests_limit}\n`);
        continue;
      }

      console.log(`📝 Пользователь ${telegramId} - подписка не найдена`);
      
      const planType = await question('Введите тип плана (basic/standard/premium): ');
      
      if (!['basic', 'standard', 'premium'].includes(planType)) {
        console.log('❌ Некорректный тип плана\n');
        continue;
      }

      const paymentId = await question('ID платежа (Enter для автогенерации): ');
      
      users.push({
        telegramId: parseInt(telegramId),
        planType,
        paymentId: paymentId || `manual_fix_${Date.now()}_${telegramId}`
      });

      console.log(`✅ Пользователь ${telegramId} добавлен в очередь\n`);
    }

    if (users.length === 0) {
      console.log('ℹ️ Нет пользователей для обработки');
      rl.close();
      return;
    }

    console.log(`\n📋 Будет обработано пользователей: ${users.length}`);
    for (const user of users) {
      console.log(`   - ${user.telegramId} (${user.planType})`);
    }

    const confirm = await question('\nПродолжить? (y/n): ');
    
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ Отменено пользователем');
      rl.close();
      return;
    }

    // Обрабатываем пользователей
    console.log('\n🚀 Начинаем обработку...\n');

    for (const user of users) {
      try {
        console.log(`📝 Обрабатываем пользователя ${user.telegramId}...`);

        // Определяем детали плана
        const planDetails = {
          'basic': { requests_limit: 100, name: 'Базовый' },
          'standard': { requests_limit: 300, name: 'Стандартный' },
          'premium': { requests_limit: 600, name: 'Премиум' }
        };

        const plan = planDetails[user.planType];
        
        // Создаем подписку
        const subscriptionData = {
          subscription_type: user.planType,
          subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 дней
          requests_limit: plan.requests_limit,
          requests_used: 0,
          payment_id: user.paymentId
        };

        const result = await updateUserSubscription(user.telegramId, subscriptionData);
        
        if (result.success) {
          console.log(`✅ Подписка создана для ${user.telegramId}:`);
          console.log(`   План: ${plan.name} (${plan.requests_limit} запросов)`);
          console.log(`   До: ${new Date(subscriptionData.subscription_end).toLocaleString('ru-RU')}`);
          console.log(`   Payment ID: ${user.paymentId}\n`);
        } else {
          console.log(`❌ Ошибка создания подписки для ${user.telegramId}\n`);
        }

      } catch (error) {
        console.log(`❌ Ошибка обработки пользователя ${user.telegramId}:`, error.message);
      }
    }

    console.log('✅ Обработка завершена!');
    console.log('\n📊 Рекомендации:');
    console.log('1. Уведомите пользователей о том, что доступ восстановлен');
    console.log('2. Попросите их перезапустить бота командой /start');
    console.log('3. Проверьте работу через команду "Мой статус" в боте');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }

  rl.close();
};

// Запускаем скрипт
fixExistingPayments();