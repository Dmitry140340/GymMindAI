import { initDatabase } from './src/services/database.js';
import { db } from './src/services/database.js';

const diagnosisPaymentSystem = async () => {
  console.log('🔍 Диагностика платежной системы\n');

  try {
    await initDatabase();
    console.log('✅ База данных подключена\n');

    // Проверяем общую статистику
    console.log('📊 ОБЩАЯ СТАТИСТИКА:');
    
    // Пользователи
    const totalUsers = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
    
    console.log(`👥 Всего пользователей: ${totalUsers}`);

    // Подписки по статусам
    const subscriptions = await new Promise((resolve, reject) => {
      db.all(`
        SELECT status, COUNT(*) as count 
        FROM subscriptions 
        GROUP BY status
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('📋 Подписки по статусам:');
    subscriptions.forEach(sub => {
      console.log(`   ${sub.status}: ${sub.count}`);
    });

    // Активные подписки
    console.log('\n🎯 АКТИВНЫЕ ПОДПИСКИ:');
    const activeSubscriptions = await new Promise((resolve, reject) => {
      db.all(`
        SELECT s.*, u.telegram_id, u.username 
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        WHERE s.status = 'active' AND datetime(s.end_date) > datetime('now')
        ORDER BY s.created_at DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (activeSubscriptions.length > 0) {
      activeSubscriptions.forEach((sub, index) => {
        console.log(`${index + 1}. Telegram ID: ${sub.telegram_id}`);
        console.log(`   План: ${sub.plan_type}`);
        console.log(`   Лимит: ${sub.requests_limit}`);
        console.log(`   Использовано: ${sub.requests_used || 0}`);
        console.log(`   Действует до: ${new Date(sub.end_date).toLocaleString('ru-RU')}`);
        console.log(`   Payment ID: ${sub.payment_id}`);
        console.log(`   Создано: ${new Date(sub.created_at).toLocaleString('ru-RU')}\n`);
      });
    } else {
      console.log('❌ Активных подписок не найдено!\n');
    }

    // Проблемные случаи
    console.log('⚠️ ПОТЕНЦИАЛЬНЫЕ ПРОБЛЕМЫ:');
    
    // Подписки с истекшим сроком но статусом active
    const expiredActive = await new Promise((resolve, reject) => {
      db.all(`
        SELECT s.*, u.telegram_id 
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        WHERE s.status = 'active' AND datetime(s.end_date) <= datetime('now')
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (expiredActive.length > 0) {
      console.log(`📅 Подписки с истекшим сроком (${expiredActive.length}):`);
      expiredActive.forEach(sub => {
        console.log(`   - Telegram ID: ${sub.telegram_id} (истек ${new Date(sub.end_date).toLocaleString('ru-RU')})`);
      });
      console.log('');
    }

    // Пользователи без подписок
    const usersWithoutSubs = await new Promise((resolve, reject) => {
      db.all(`
        SELECT u.telegram_id, u.username, u.created_at
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
        WHERE s.id IS NULL
        ORDER BY u.created_at DESC
        LIMIT 10
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (usersWithoutSubs.length > 0) {
      console.log(`👥 Пользователи без активных подписок (показано 10 из всех):`);
      usersWithoutSubs.forEach(user => {
        console.log(`   - Telegram ID: ${user.telegram_id} (${user.username || 'без username'})`);
        console.log(`     Регистрация: ${new Date(user.created_at).toLocaleString('ru-RU')}`);
      });
      console.log('');
    }

    // Последние платежи
    console.log('💰 ПОСЛЕДНИЕ ПЛАТЕЖИ (по payment_id):');
    const recentPayments = await new Promise((resolve, reject) => {
      db.all(`
        SELECT s.*, u.telegram_id
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        WHERE s.payment_id IS NOT NULL AND s.payment_id != ''
        ORDER BY s.created_at DESC
        LIMIT 5
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (recentPayments.length > 0) {
      recentPayments.forEach((payment, index) => {
        console.log(`${index + 1}. ${payment.payment_id}`);
        console.log(`   Пользователь: ${payment.telegram_id}`);
        console.log(`   План: ${payment.plan_type}`);
        console.log(`   Статус: ${payment.status}`);
        console.log(`   Создан: ${new Date(payment.created_at).toLocaleString('ru-RU')}\n`);
      });
    } else {
      console.log('❌ Платежи с payment_id не найдены\n');
    }

    console.log('🔧 РЕКОМЕНДАЦИИ:');
    console.log('1. Если есть пользователи, которые оплатили но не получили доступ:');
    console.log('   - Запустите: node fix_existing_payments.js');
    console.log('2. Для очистки истекших подписок:');
    console.log('   - В боте есть автоматическая очистка при запуске');
    console.log('3. Для мониторинга новых платежей:');
    console.log('   - Проверьте логи webhook: /webhook/payment');
    console.log('   - Убедитесь что URL webhook настроен в YooKassa');

  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
  }

  process.exit(0);
};

diagnosisPaymentSystem();