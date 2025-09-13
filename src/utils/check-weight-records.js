import { initDatabase, getUserMetrics } from '../services/database.js';

async function checkWeightRecords() {
  try {
    // Инициализируем базу данных
    await initDatabase();
    
    // Проверяем записи веса для пользователя 55 (ID из логов)
    const weightRecords = await getUserMetrics(55, 'weight', 20);
    
    console.log('🔍 Записи веса пользователя 55:');
    console.log('Всего записей:', weightRecords.length);
    console.log('\nДетали записей:');
    
    weightRecords.forEach((record, index) => {
      const date = new Date(record.recorded_at);
      console.log(`${index + 1}. ${record.value} ${record.unit} - ${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU')}`);
      console.log(`   ID: ${record.id}, Metric Type: ${record.metric_type}`);
      if (record.notes) {
        console.log(`   Заметки: ${record.notes}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
  
  process.exit(0);
}

checkWeightRecords();
