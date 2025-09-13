import { initDatabase, getUserDetailedWorkouts } from '../services/database.js';

async function testBeautifulFormat() {
  try {
    // Инициализируем базу данных
    await initDatabase();
    
    console.log('🎨 Тестируем новый красивый формат истории тренировок...');
    
    // Тестируем для пользователя с ID 55
    const userId = 55;
    const workouts = await getUserDetailedWorkouts(userId, 5);
    
    console.log(`📊 Найдено тренировок: ${workouts.length}\n`);
    
    if (workouts.length > 0) {
      // Симулируем новый красивый формат
      let message = '🏋️‍♂️ История тренировок (последние 5)\n\n';
      
      workouts.forEach((workout, index) => {
        const date = new Date(workout.completed_at).toLocaleDateString('ru-RU');
        const time = new Date(workout.completed_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const isLatest = index === 0 ? ' 🌟' : '';
        
        message += `📅 ${date} в ${time}${isLatest}\n`;
        message += `💪 Тип: ${workout.workout_type === 'strength' ? 'Силовая тренировка' : workout.workout_type}\n`;
        
        if (workout.duration_minutes > 0) {
          message += `⏱️ Длительность: ${workout.duration_minutes} мин\n`;
        }
        
        // Показываем детальную информацию об упражнениях
        if (workout.workout_details && workout.workout_details.exercises) {
          const details = workout.workout_details;
          const exerciseCount = details.exercises.length;
          const totalSets = details.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
          const totalReps = details.exercises.reduce((sum, ex) => 
            sum + ex.sets.reduce((setSum, set) => setSum + set.reps, 0), 0);
          const totalWeight = details.exercises.reduce((sum, ex) => 
            sum + ex.sets.reduce((setSum, set) => setSum + ((set.weight || 0) * set.reps), 0), 0);
          
          message += `📊 ${exerciseCount} упражнений • ${totalSets} подходов • ${totalReps} повторений\n`;
          if (totalWeight > 0) {
            message += `⚖️ Поднято с отягощением: ${totalWeight} кг\n`;
          }
          
          // Показываем список упражнений
          message += `\n🎯 Упражнения:\n`;
          details.exercises.forEach((ex, i) => {
            const exerciseTotalReps = ex.sets.reduce((sum, set) => sum + set.reps, 0);
            const exerciseWeight = ex.sets.length > 0 ? (ex.sets[0].weight || 0) : 0;
            const weightText = exerciseWeight === 0 ? 'собственный вес' : `${exerciseWeight} кг`;
            const avgReps = exerciseTotalReps > 0 ? Math.round(exerciseTotalReps / ex.sets.length) : 0;
            message += `   ${i + 1}. ${ex.name}: ${ex.sets.length}×${avgReps} (${weightText})\n`;
          });
        }
        
        message += '\n' + '─'.repeat(25) + '\n\n';
      });
      
      message += '🌟 - последняя тренировка\n';
      message += '💡 Формат: подходы×средние повторения';
      
      console.log('📱 Новый красивый формат:');
      console.log('=' .repeat(50));
      console.log(message);
      console.log('=' .repeat(50));
    } else {
      const emptyMessage = '🏋️‍♂️ История тренировок\n\n' +
        '📝 У вас пока нет записей тренировок.\n\n' +
        '💡 Используйте "🏋️‍♂️ Добавить тренировку" для создания первой записи!';
      
      console.log('📱 Формат для пустой истории:');
      console.log('=' .repeat(50));
      console.log(emptyMessage);
      console.log('=' .repeat(50));
    }
    
    console.log('\n🎉 Тест завершен!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    process.exit(0);
  }
}

// Запускаем тест
testBeautifulFormat();
