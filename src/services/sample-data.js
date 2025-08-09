import { 
  addFitnessMetric, 
  addWorkout, 
  addAchievement 
} from './database.js';

// Функция для добавления тестовых данных пользователю
export async function addSampleData(userId) {
  try {
    console.log(`Добавляем тестовые данные для пользователя ${userId}`);
    
    // Добавляем данные о весе за последние 30 дней
    const today = new Date();
    const weights = [82.5, 82.2, 81.8, 81.5, 81.3, 81.0, 80.8, 80.5, 80.2, 79.9];
    
    for (let i = 0; i < weights.length; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (weights.length - 1 - i) * 3); // Каждые 3 дня
      await addFitnessMetric(userId, 'weight', weights[i], 'kg', null, date.toISOString());
    }
    
    // Добавляем данные о росте
    await addFitnessMetric(userId, 'height', 175, 'cm', null, new Date().toISOString());
    
    // Добавляем тренировки за последние 2 недели
    const workoutTypes = ['strength', 'cardio', 'yoga', 'functional'];
    const workoutDurations = [60, 45, 30, 75, 50, 40, 55];
    const caloriesData = [400, 300, 200, 450, 350, 250, 380];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i * 2); // Каждые 2 дня
      
      const type = workoutTypes[i % workoutTypes.length];
      const duration = workoutDurations[i];
      const calories = caloriesData[i];
      const intensity = Math.floor(Math.random() * 5) + 1; // 1-5
      const exercisesCount = Math.floor(Math.random() * 8) + 3; // 3-10 упражнений
      
      await addWorkout(userId, type, duration, calories, intensity, exercisesCount, `Тренировка ${type}`);
    }
    
    // Добавляем достижения
    const achievements = [
      {
        type: 'first_workout',
        title: '🏃‍♂️ Первые шаги',
        description: 'Записали свою первую тренировку'
      },
      {
        type: 'weight_loss',
        title: '📉 Начало пути',
        description: 'Сбросили первый килограмм'
      },
      {
        type: 'consistency',
        title: '🔥 Неделя активности',
        description: 'Тренировались 7 дней подряд'
      }
    ];
    
    for (let i = 0; i < achievements.length; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (achievements.length - 1 - i) * 5); // С интервалом в 5 дней
      await addAchievement(userId, achievements[i].type, achievements[i].title, achievements[i].description);
    }
    
    console.log('Тестовые данные успешно добавлены!');
    return true;
    
  } catch (error) {
    console.error('Ошибка добавления тестовых данных:', error);
    return false;
  }
}

// Функция для очистки всех данных пользователя (для тестирования)
export async function clearUserData(userId) {
  try {
    // Здесь можно добавить функции удаления данных из всех таблиц
    console.log(`Очистка данных пользователя ${userId} - функция не реализована`);
    return true;
  } catch (error) {
    console.error('Ошибка очистки данных:', error);
    return false;
  }
}
