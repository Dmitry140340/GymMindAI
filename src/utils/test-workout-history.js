import { initDatabase, getUserDetailedWorkouts } from '../services/database.js';

async function testWorkoutHistory() {
  try {
    // Инициализируем базу данных
    await initDatabase();
    
    console.log('🔍 Тестируем историю тренировок...');
    
    // Тестируем для пользователя с ID 55 (из логов)
    const userId = 55;
    const workouts = await getUserDetailedWorkouts(userId, 10);
    
    console.log(`📊 Найдено тренировок для пользователя ${userId}: ${workouts.length}`);
    
    if (workouts.length > 0) {
      console.log('\n💪 Детализированные тренировки:');
      workouts.forEach((workout, index) => {
        const date = new Date(workout.completed_at).toLocaleDateString('ru-RU');
        console.log(`\n${index + 1}. ID: ${workout.id}`);
        console.log(`   Дата: ${date}`);
        console.log(`   Тип: ${workout.workout_type}`);
        console.log(`   Длительность: ${workout.duration_minutes} мин`);
        
        if (workout.workout_details && workout.workout_details.exercises) {
          const details = workout.workout_details;
          console.log(`   Упражнений: ${details.totalExercises || details.exercises.length}`);
          console.log(`   Подходов: ${details.totalSets || 'не указано'}`);
          console.log(`   Повторений: ${details.totalReps || 'не указано'}`);
          console.log(`   Общий вес: ${details.totalWeight || 'не указано'} кг`);
          
          if (details.exercises && details.exercises.length > 0) {
            console.log(`   Упражнения:`);
            details.exercises.forEach((ex, i) => {
              console.log(`     ${i + 1}. ${ex.name} - ${ex.sets.length} подходов`);
            });
          }
        } else {
          console.log(`   ⚠️ Детали отсутствуют или повреждены`);
        }
      });
    } else {
      console.log('\n❌ Тренировки не найдены');
    }
    
    console.log('\n🎉 Тест завершен!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    process.exit(0);
  }
}

// Запускаем тест
testWorkoutHistory();
