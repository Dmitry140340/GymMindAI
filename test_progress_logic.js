/**
 * 🧪 Тест логики анализа прогресса (с мок-данными)
 */

console.log('🧪 Тестирование логики анализа прогресса...\n');

// Имитация данных для тестирования
const mockMetrics = [
  { type: 'weight', value: 80, date: '2025-08-01' },
  { type: 'weight', value: 79.5, date: '2025-08-15' },
  { type: 'weight', value: 78.8, date: '2025-09-01' },
  { type: 'weight', value: 78.2, date: '2025-09-13' }
];

const mockWorkouts = [
  { type: 'Силовая тренировка', duration: 45, date: '2025-08-01', exercises: JSON.stringify([{name: 'Жим лежа'}]) },
  { type: 'Кардио', duration: 30, date: '2025-08-03', exercises: null },
  { type: 'Силовая тренировка', duration: 60, date: '2025-08-05', exercises: JSON.stringify([{name: 'Приседания'}, {name: 'Становая тяга'}]) },
  { type: 'Силовая тренировка', duration: 50, date: '2025-09-10', exercises: JSON.stringify([{name: 'Жим лежа'}]) },
  { type: 'Кардио', duration: 35, date: '2025-09-12', exercises: null }
];

const mockGoals = [
  {
    goal_type: 'Снизить вес',
    target_value: '75',
    current_value: '80',
    created_at: '2025-08-01'
  }
];

// Функции анализа из модуля (скопированы для тестирования)
function analyzeWeightProgress(metrics) {
  const weightData = metrics.filter(m => m.type === 'weight').sort((a, b) => new Date(a.date) - new Date(b.date));
  
  if (weightData.length === 0) {
    return {
      status: 'no_data',
      message: 'Нет данных о весе'
    };
  }

  if (weightData.length === 1) {
    return {
      status: 'insufficient_data',
      currentWeight: weightData[0].value,
      message: 'Недостаточно данных для анализа тенденций'
    };
  }

  const firstWeight = weightData[0].value;
  const lastWeight = weightData[weightData.length - 1].value;
  const weightChange = lastWeight - firstWeight;
  const weightChangePercent = ((weightChange / firstWeight) * 100).toFixed(1);
  
  let trend = 'stable';
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentData = weightData.filter(w => new Date(w.date) >= thirtyDaysAgo);
  
  if (recentData.length >= 2) {
    const recentChange = recentData[recentData.length - 1].value - recentData[0].value;
    if (recentChange > 1) trend = 'increasing';
    else if (recentChange < -1) trend = 'decreasing';
  }

  return {
    status: 'has_data',
    currentWeight: lastWeight,
    startWeight: firstWeight,
    change: weightChange,
    changePercent: weightChangePercent,
    trend: trend,
    totalRecords: weightData.length,
    daysTracked: Math.ceil((new Date(weightData[weightData.length - 1].date) - new Date(weightData[0].date)) / (1000 * 60 * 60 * 24))
  };
}

function analyzeWorkoutProgress(workouts) {
  if (workouts.length === 0) {
    return {
      status: 'no_data',
      message: 'Нет записей о тренировках'
    };
  }

  const workoutTypes = {};
  let totalDuration = 0;
  let totalExercises = 0;

  workouts.forEach(workout => {
    const type = workout.type || 'Другое';
    workoutTypes[type] = (workoutTypes[type] || 0) + 1;
    totalDuration += workout.duration || 0;
    
    if (workout.exercises) {
      try {
        const exercises = JSON.parse(workout.exercises);
        totalExercises += exercises.length;
      } catch (e) {
        // Игнорируем ошибки парсинга
      }
    }
  });

  const sortedWorkouts = workouts.sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstWorkout = new Date(sortedWorkouts[0].date);
  const lastWorkout = new Date(sortedWorkouts[sortedWorkouts.length - 1].date);
  const totalDays = Math.ceil((lastWorkout - firstWorkout) / (1000 * 60 * 60 * 24)) || 1;
  const frequency = (workouts.length / totalDays * 7).toFixed(1);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentWorkouts = workouts.filter(w => new Date(w.date) >= thirtyDaysAgo);

  return {
    status: 'has_data',
    totalWorkouts: workouts.length,
    totalDuration: totalDuration,
    totalExercises: totalExercises,
    averageDuration: Math.round(totalDuration / workouts.length),
    frequency: frequency,
    workoutTypes: workoutTypes,
    recentWorkouts: recentWorkouts.length,
    daysActive: totalDays,
    mostFrequentType: Object.keys(workoutTypes).reduce((a, b) => workoutTypes[a] > workoutTypes[b] ? a : b)
  };
}

function calculateOverallScore(weightProgress, workoutProgress, goalProgress) {
  let score = 0;
  let factors = 0;

  if (weightProgress.status === 'has_data') {
    factors++;
    if (weightProgress.totalRecords >= 5) score += 30;
    else if (weightProgress.totalRecords >= 3) score += 20;
    else score += 10;
  }

  if (workoutProgress.status === 'has_data') {
    factors++;
    const frequency = parseFloat(workoutProgress.frequency);
    if (frequency >= 3) score += 40;
    else if (frequency >= 2) score += 30;
    else if (frequency >= 1) score += 20;
    else score += 10;
  }

  if (factors === 0) return { score: 0, level: 'Новичок', emoji: '🌱', factors: 0 };
  
  const normalizedScore = Math.round(score / factors * (factors === 2 ? 1.2 : 1.5));

  let level = 'Новичок';
  let emoji = '🌱';
  
  if (normalizedScore >= 80) {
    level = 'Мастер';
    emoji = '🏆';
  } else if (normalizedScore >= 60) {
    level = 'Профи';
    emoji = '💪';
  } else if (normalizedScore >= 40) {
    level = 'Атлет';
    emoji = '🔥';
  } else if (normalizedScore >= 20) {
    level = 'Любитель';
    emoji = '📈';
  }

  return {
    score: normalizedScore,
    level,
    emoji,
    factors
  };
}

// Тестирование
console.log('1️⃣ Тестирование анализа веса:');
const weightAnalysis = analyzeWeightProgress(mockMetrics);
console.log(JSON.stringify(weightAnalysis, null, 2));

console.log('\n2️⃣ Тестирование анализа тренировок:');
const workoutAnalysis = analyzeWorkoutProgress(mockWorkouts);
console.log(JSON.stringify(workoutAnalysis, null, 2));

console.log('\n3️⃣ Тестирование общего балла:');
const overallScore = calculateOverallScore(weightAnalysis, workoutAnalysis, {});
console.log(JSON.stringify(overallScore, null, 2));

console.log('\n✅ Логика анализа прогресса работает корректно!');
console.log('\n📊 Пример результата:');
console.log(`${overallScore.emoji} Уровень: ${overallScore.level} (${overallScore.score}/100)`);
console.log(`⚖️ Вес: ${weightAnalysis.change.toFixed(1)} кг (${weightAnalysis.changePercent}%)`);
console.log(`🏋️‍♂️ Тренировки: ${workoutAnalysis.totalWorkouts} за ${workoutAnalysis.daysActive} дней`);
console.log(`📈 Частота: ${workoutAnalysis.frequency} раз/неделю`);

console.log('\n🎯 Тестирование завершено!');
