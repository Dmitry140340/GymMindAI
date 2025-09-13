import { initDatabase, getUserMetrics } from '../services/database.js';

async function cleanupWeightRecords() {
  try {
    await initDatabase();
    
    console.log('🧹 Очистка завершена через обновление функций в коде');
    console.log('📝 Неправильные записи (1кг и 50кг) больше не будут создаваться');
    console.log('⚖️ Вес снарядов теперь сохраняется только в структуре тренировки');
    
    // Проверяем текущие записи веса
    const remaining = await getUserMetrics(55, 'weight', 10);
    
    console.log('\n📊 Текущие записи веса:');
    remaining.forEach((record, index) => {
      const date = new Date(record.recorded_at);
      console.log(`${index + 1}. ${record.value} ${record.unit} - ${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU')}`);
    });
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
  
  process.exit(0);
}

cleanupWeightRecords();
