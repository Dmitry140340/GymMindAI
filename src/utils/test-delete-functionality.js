import { 
  getUserDetailedWorkouts, 
  deleteLastWorkout, 
  deleteLastWeight,
  deleteAllWorkouts,
  deleteAllWeights 
} from '../services/database.js';

// Тестируем функции удаления
async function testDeleteFunctionality() {
  try {
    console.log('🧪 Тестирование функций удаления записей...\n');

    // Тестовый ID пользователя (замените на реальный для тестирования)
    const testUserId = 1;

    // 1. Проверяем историю тренировок
    console.log('📋 1. Проверяем текущую историю тренировок:');
    const workouts = await getUserDetailedWorkouts(testUserId, 5);
    console.log(`   Найдено тренировок: ${workouts.length}`);
    
    if (workouts.length > 0) {
      const lastWorkout = workouts[0];
      console.log(`   Последняя: ${new Date(lastWorkout.completed_at).toLocaleDateString('ru-RU')} - ${lastWorkout.workout_type}`);
      
      if (lastWorkout.mood_before || lastWorkout.mood_after) {
        console.log(`   Самочувствие: до ${lastWorkout.mood_before || 'не указано'}/10, после ${lastWorkout.mood_after || 'не указано'}/10`);
      }
      
      if (lastWorkout.notes) {
        console.log(`   Комментарий: "${lastWorkout.notes}"`);
      }
      
      if (lastWorkout.workout_details && lastWorkout.workout_details.exercises) {
        const details = lastWorkout.workout_details;
        console.log(`   Упражнений: ${details.exercises.length}`);
        
        if (details.comments) {
          console.log(`   Заметки о тренировке: "${details.comments}"`);
        }
      }
    }

    console.log('\n✅ Тест завершен! Проверьте вывод выше.\n');
    
    // Инструкции по тестированию
    console.log('📝 Инструкции по тестированию в боте:');
    console.log('1. Откройте Telegram бота');
    console.log('2. Перейдите в "🎯 Мои данные"');
    console.log('3. Выберите "🗑️ Удалить записи"');
    console.log('4. Проверьте все варианты удаления');
    console.log('5. Посмотрите "🏋️‍♂️ История тренировок" - должны отображаться комментарии и самочувствие');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  }
}

testDeleteFunctionality();
