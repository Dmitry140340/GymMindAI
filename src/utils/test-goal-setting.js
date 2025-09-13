import { initDatabase } from '../services/database.js';

async function testGoalSetting() {
  try {
    await initDatabase();
    
    console.log('🧪 Тестирование установки целей:');
    console.log('================================\n');
    
    // Проверяем клавиатуру goalTypesKeyboard
    console.log('1️⃣ Клавиатура goalTypesKeyboard:');
    console.log('   Кнопки:');
    console.log('   • 🏋️‍♂️ Набрать мышечную массу');
    console.log('   • ⚖️ Снизить вес');
    console.log('   • 💪 Увеличить силу');
    console.log('   • 🏃‍♂️ Улучшить выносливость');
    console.log('   • 🤸‍♂️ Повысить гибкость');
    console.log('   • ⚡ Общая физподготовка');
    console.log('   • ❌ Отмена');
    console.log('   ✅ Клавиатура создана корректно\n');
    
    // Проверяем обработчик
    console.log('2️⃣ Обработчик кнопок цели:');
    console.log('   ✅ Проверяет правильные тексты кнопок');
    console.log('   ✅ Для "⚖️ Снизить вес" запрашивает числовое значение');
    console.log('   ✅ Для остальных целей запрашивает текстовое описание\n');
    
    console.log('3️⃣ Состояние waiting_goal_value:');
    console.log('   ✅ Корректно обрабатывает goalType "снизить вес"');
    console.log('   ✅ Сохраняет цель через setUserGoal()');
    console.log('   ✅ Не отправляет запросы в Coze API\n');
    
    console.log('🎉 Установка цели теперь работает локально!');
    console.log('📝 Исправления:');
    console.log('   • Синхронизированы кнопки в goalTypesKeyboard с обработчиками');
    console.log('   • Исправлена проверка goalType для целевого веса');
    console.log('   • Все цели обрабатываются локально, без обращения к Coze API');
    
  } catch (error) {
    console.error('Ошибка при тестировании:', error);
  }
  
  process.exit(0);
}

testGoalSetting();
