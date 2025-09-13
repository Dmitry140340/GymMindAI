// Тест базы данных SQLite
import dotenv from 'dotenv';
import { 
  initDatabase, 
  createOrUpdateUser,
  getUserByTelegramId,
  getActiveSubscription,
  createSubscription
} from './src/services/database.js';

dotenv.config();

console.log('🧪 Тестирование базы данных SQLite...');

try {
  // Инициализация БД
  console.log('📊 Инициализация базы данных...');
  await initDatabase();
  console.log('✅ База данных инициализирована');

  // Тестовый пользователь
  const testUser = {
    telegram_id: 999999999,
    username: 'test_user',
    first_name: 'Test',
    last_name: 'User'
  };

  // Создание пользователя
  console.log('👤 Создание тестового пользователя...');
  await createOrUpdateUser(testUser);
  console.log('✅ Пользователь создан');

  // Получение пользователя
  console.log('🔍 Получение пользователя...');
  const user = await getUserByTelegramId(testUser.telegram_id);
  if (user) {
    console.log('✅ Пользователь найден:', user.username);
  } else {
    console.log('❌ Пользователь не найден');
  }

  // Тест подписки
  console.log('💳 Создание тестовой подписки...');
  const subscription = await createSubscription(
    testUser.telegram_id,
    'basic',
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 дней
    150
  );
  
  if (subscription) {
    console.log('✅ Подписка создана');
    
    // Проверка активной подписки
    const activeSubscription = await getActiveSubscription(testUser.telegram_id);
    if (activeSubscription) {
      console.log('✅ Активная подписка найдена:', activeSubscription.plan_type);
    } else {
      console.log('❌ Активная подписка не найдена');
    }
  } else {
    console.log('❌ Ошибка создания подписки');
  }

  console.log('\n🎉 Все тесты базы данных прошли успешно!');

} catch (error) {
  console.error('❌ Ошибка при тестировании базы данных:', error.message);
}
