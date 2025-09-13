/**
 * 📈 Модуль анализа прогресса пользователя
 * Комплексный анализ достижений, тенденций и рекомендаций
 */

import { getUserMetrics, getUserWorkouts, getUserByTelegramId, getUserGoals } from './database.js';

/**
 * Анализирует прогресс пользователя по всем параметрам
 */
export async function analyzeUserProgress(userId) {
  try {
    const user = await getUserByTelegramId(userId);
    if (!user) {
      return {
        success: false,
        error: 'Пользователь не найден'
      };
    }

    // Получаем все данные пользователя
    const metrics = await getUserMetrics(user.id);
    const workouts = await getUserWorkouts(user.id);
    const goals = await getUserGoals(user.id);

    // Анализируем различные аспекты прогресса
    const weightProgress = analyzeWeightProgress(metrics);
    const workoutProgress = analyzeWorkoutProgress(workouts);
    const goalProgress = analyzeGoalProgress(goals, metrics, workouts);
    const overallScore = calculateOverallScore(weightProgress, workoutProgress, goalProgress);
    const recommendations = generateRecommendations(weightProgress, workoutProgress, goalProgress);
    const achievements = generateAchievements(metrics, workouts, goals);

    return {
      success: true,
      data: {
        user: {
          name: user.first_name,
          totalDays: Math.ceil((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
        },
        weight: weightProgress,
        workouts: workoutProgress,
        goals: goalProgress,
        overallScore,
        recommendations,
        achievements
      }
    };

  } catch (error) {
    console.error('Ошибка анализа прогресса:', error);
    return {
      success: false,
      error: 'Ошибка при анализе прогресса'
    };
  }
}

/**
 * Анализирует прогресс по весу
 */
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
  
  // Анализ тенденций за последние 30 дней
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentData = weightData.filter(w => new Date(w.date) >= thirtyDaysAgo);
  
  let trend = 'stable';
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

/**
 * Анализирует прогресс тренировок
 */
function analyzeWorkoutProgress(workouts) {
  if (workouts.length === 0) {
    return {
      status: 'no_data',
      message: 'Нет записей о тренировках'
    };
  }

  // Группируем по типам тренировок
  const workoutTypes = {};
  let totalDuration = 0;
  let totalExercises = 0;

  workouts.forEach(workout => {
    const type = workout.type || 'Другое';
    workoutTypes[type] = (workoutTypes[type] || 0) + 1;
    totalDuration += workout.duration || 0;
    
    // Подсчет упражнений для силовых тренировок
    if (workout.exercises) {
      try {
        const exercises = JSON.parse(workout.exercises);
        totalExercises += exercises.length;
      } catch (e) {
        // Игнорируем ошибки парсинга
      }
    }
  });

  // Анализ частоты тренировок
  const sortedWorkouts = workouts.sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstWorkout = new Date(sortedWorkouts[0].date);
  const lastWorkout = new Date(sortedWorkouts[sortedWorkouts.length - 1].date);
  const totalDays = Math.ceil((lastWorkout - firstWorkout) / (1000 * 60 * 60 * 24)) || 1;
  const frequency = (workouts.length / totalDays * 7).toFixed(1); // тренировок в неделю

  // Анализ последних 30 дней
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

/**
 * Анализирует прогресс по целям
 */
function analyzeGoalProgress(goals, metrics, workouts) {
  if (goals.length === 0) {
    return {
      status: 'no_goals',
      message: 'Цели не установлены'
    };
  }

  const goalAnalysis = goals.map(goal => {
    let progress = 0;
    let status = 'in_progress';

    // Анализ прогресса в зависимости от типа цели
    if (goal.goal_type.includes('вес') && goal.goal_type.includes('Снизить')) {
      const weightData = metrics.filter(m => m.type === 'weight').sort((a, b) => new Date(b.date) - new Date(a.date));
      if (weightData.length > 0) {
        const currentWeight = weightData[0].value;
        const targetWeight = parseFloat(goal.target_value);
        const startWeight = parseFloat(goal.current_value);
        
        if (startWeight > targetWeight) {
          const totalNeeded = startWeight - targetWeight;
          const achieved = startWeight - currentWeight;
          progress = Math.max(0, Math.min(100, (achieved / totalNeeded) * 100));
          
          if (currentWeight <= targetWeight) status = 'completed';
          else if (achieved > 0) status = 'good_progress';
          else status = 'needs_attention';
        }
      }
    } else if (goal.goal_type.includes('массу') && goal.goal_type.includes('Набрать')) {
      const weightData = metrics.filter(m => m.type === 'weight').sort((a, b) => new Date(b.date) - new Date(a.date));
      if (weightData.length > 0) {
        const currentWeight = weightData[0].value;
        const targetWeight = parseFloat(goal.target_value);
        const startWeight = parseFloat(goal.current_value);
        
        if (startWeight < targetWeight) {
          const totalNeeded = targetWeight - startWeight;
          const achieved = currentWeight - startWeight;
          progress = Math.max(0, Math.min(100, (achieved / totalNeeded) * 100));
          
          if (currentWeight >= targetWeight) status = 'completed';
          else if (achieved > 0) status = 'good_progress';
          else status = 'needs_attention';
        }
      }
    } else {
      // Для других целей анализируем по активности тренировок
      const goalDate = new Date(goal.created_at);
      const workoutsSinceGoal = workouts.filter(w => new Date(w.date) >= goalDate);
      
      if (workoutsSinceGoal.length >= 10) {
        progress = 80;
        status = 'good_progress';
      } else if (workoutsSinceGoal.length >= 5) {
        progress = 50;
        status = 'in_progress';
      } else {
        progress = 20;
        status = 'needs_attention';
      }
    }

    return {
      ...goal,
      progress: Math.round(progress),
      status
    };
  });

  return {
    status: 'has_goals',
    totalGoals: goals.length,
    completedGoals: goalAnalysis.filter(g => g.status === 'completed').length,
    goals: goalAnalysis,
    averageProgress: Math.round(goalAnalysis.reduce((sum, g) => sum + g.progress, 0) / goalAnalysis.length)
  };
}

/**
 * Рассчитывает общий балл прогресса
 */
function calculateOverallScore(weightProgress, workoutProgress, goalProgress) {
  let score = 0;
  let factors = 0;

  // Оценка прогресса по весу (30%)
  if (weightProgress.status === 'has_data') {
    factors++;
    if (weightProgress.totalRecords >= 5) score += 30;
    else if (weightProgress.totalRecords >= 3) score += 20;
    else score += 10;
  }

  // Оценка активности тренировок (40%)
  if (workoutProgress.status === 'has_data') {
    factors++;
    const frequency = parseFloat(workoutProgress.frequency);
    if (frequency >= 3) score += 40;
    else if (frequency >= 2) score += 30;
    else if (frequency >= 1) score += 20;
    else score += 10;
  }

  // Оценка достижения целей (30%)
  if (goalProgress.status === 'has_goals') {
    factors++;
    const avgProgress = goalProgress.averageProgress;
    if (avgProgress >= 80) score += 30;
    else if (avgProgress >= 60) score += 25;
    else if (avgProgress >= 40) score += 20;
    else if (avgProgress >= 20) score += 15;
    else score += 10;
  }

  // Нормализуем оценку
  if (factors === 0) return 0;
  const normalizedScore = Math.round(score / factors * (factors === 3 ? 1 : (factors === 2 ? 1.2 : 1.5)));

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

/**
 * Генерирует персональные рекомендации
 */
function generateRecommendations(weightProgress, workoutProgress, goalProgress) {
  const recommendations = [];

  // Рекомендации по весу
  if (weightProgress.status === 'no_data') {
    recommendations.push({
      type: 'weight',
      priority: 'high',
      title: '⚖️ Начните отслеживать вес',
      text: 'Регулярное взвешивание поможет контролировать прогресс. Взвешивайтесь утром, натощак.'
    });
  } else if (weightProgress.status === 'has_data' && weightProgress.trend === 'stable') {
    recommendations.push({
      type: 'weight',
      priority: 'medium',
      title: '📊 Стабильный вес',
      text: 'Ваш вес стабилен. Если цель - изменение веса, скорректируйте питание или тренировки.'
    });
  }

  // Рекомендации по тренировкам
  if (workoutProgress.status === 'no_data') {
    recommendations.push({
      type: 'workout',
      priority: 'high',
      title: '🏋️‍♂️ Время начать тренировки',
      text: 'Добавьте первую тренировку! Начните с 2-3 раз в неделю по 30-45 минут.'
    });
  } else if (workoutProgress.status === 'has_data') {
    const frequency = parseFloat(workoutProgress.frequency);
    if (frequency < 2) {
      recommendations.push({
        type: 'workout',
        priority: 'high',
        title: '📈 Увеличьте частоту тренировок',
        text: `Вы тренируетесь ${frequency} раз в неделю. Для лучших результатов рекомендуется 3-4 тренировки в неделю.`
      });
    }
    
    if (workoutProgress.averageDuration < 30) {
      recommendations.push({
        type: 'workout',
        priority: 'medium',
        title: '⏱️ Увеличьте продолжительность',
        text: `Средняя тренировка длится ${workoutProgress.averageDuration} мин. Оптимально - 45-60 минут.`
      });
    }
  }

  // Рекомендации по целям
  if (goalProgress.status === 'no_goals') {
    recommendations.push({
      type: 'goals',
      priority: 'high',
      title: '🎯 Поставьте цель',
      text: 'Четкие цели мотивируют и помогают отслеживать прогресс. Установите реалистичную цель на месяц.'
    });
  } else if (goalProgress.status === 'has_goals' && goalProgress.averageProgress < 50) {
    recommendations.push({
      type: 'goals',
      priority: 'medium',
      title: '🎯 Пересмотрите стратегию',
      text: 'Прогресс по целям медленный. Возможно, стоит скорректировать план или цели.'
    });
  }

  // Позитивные рекомендации
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'positive',
      priority: 'low',
      title: '🌟 Отличная работа!',
      text: 'Вы на правильном пути! Продолжайте в том же духе и не забывайте отдыхать.'
    });
  }

  return recommendations.slice(0, 3); // Максимум 3 рекомендации
}

/**
 * Генерирует достижения пользователя
 */
function generateAchievements(metrics, workouts, goals) {
  const achievements = [];

  // Достижения по весу
  const weightData = metrics.filter(m => m.type === 'weight');
  if (weightData.length >= 7) {
    achievements.push({
      title: '📊 Постоянство в отслеживании',
      description: `Записали вес ${weightData.length} раз`,
      emoji: '⚖️'
    });
  }

  // Достижения по тренировкам
  if (workouts.length >= 10) {
    achievements.push({
      title: '💪 Активный спортсмен',
      description: `Провели ${workouts.length} тренировок`,
      emoji: '🏋️‍♂️'
    });
  }

  const totalDuration = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
  if (totalDuration >= 1000) {
    achievements.push({
      title: '⏱️ Тысяча минут',
      description: `Потратили ${totalDuration} минут на тренировки`,
      emoji: '🔥'
    });
  }

  // Достижения по целям
  const completedGoals = goals.filter(g => {
    // Простая проверка - если цель создана более 30 дней назад и есть активность
    const goalAge = Date.now() - new Date(g.created_at).getTime();
    return goalAge > 30 * 24 * 60 * 60 * 1000;
  });

  if (completedGoals.length > 0) {
    achievements.push({
      title: '🎯 Целеустремленность',
      description: `Работаете над ${goals.length} целями`,
      emoji: '🏆'
    });
  }

  // Достижения по постоянству
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentWorkouts = workouts.filter(w => new Date(w.date) >= sevenDaysAgo);
  if (recentWorkouts.length >= 3) {
    achievements.push({
      title: '🔥 Недельная серия',
      description: 'Тренировались 3+ раз на этой неделе',
      emoji: '📈'
    });
  }

  return achievements.slice(0, 4); // Максимум 4 достижения
}

/**
 * Форматирует отчет о прогрессе для отправки пользователю
 */
export function formatProgressReport(progressData) {
  const { user, weight, workouts, goals, overallScore, recommendations, achievements } = progressData;
  
  let report = `📈 **ОТЧЕТ О ПРОГРЕССЕ**\n\n`;
  report += `👋 ${user.name}, вы с нами уже ${user.totalDays} дней!\n\n`;
  
  // Общая оценка
  report += `${overallScore.emoji} **Общая оценка: ${overallScore.score}/100**\n`;
  report += `🏅 Уровень: ${overallScore.level}\n\n`;
  
  // Прогресс по весу
  report += `⚖️ **ВЕС**\n`;
  if (weight.status === 'has_data') {
    report += `• Текущий: ${weight.currentWeight} кг\n`;
    report += `• Изменение: ${weight.change > 0 ? '+' : ''}${weight.change.toFixed(1)} кг (${weight.changePercent}%)\n`;
    report += `• Записей: ${weight.totalRecords} за ${weight.daysTracked} дней\n`;
    
    const trendEmoji = weight.trend === 'increasing' ? '📈' : weight.trend === 'decreasing' ? '📉' : '➡️';
    report += `• Тенденция: ${trendEmoji}\n\n`;
  } else {
    report += `• Данных пока нет\n\n`;
  }
  
  // Прогресс тренировок
  report += `🏋️‍♂️ **ТРЕНИРОВКИ**\n`;
  if (workouts.status === 'has_data') {
    report += `• Всего: ${workouts.totalWorkouts} тренировок\n`;
    report += `• Частота: ${workouts.frequency} раз/неделю\n`;
    report += `• Время: ${Math.round(workouts.totalDuration/60)} часов суммарно\n`;
    report += `• Любимый тип: ${workouts.mostFrequentType}\n\n`;
  } else {
    report += `• Тренировок пока нет\n\n`;
  }
  
  // Прогресс целей
  report += `🎯 **ЦЕЛИ**\n`;
  if (goals.status === 'has_goals') {
    report += `• Активных целей: ${goals.totalGoals}\n`;
    report += `• Выполнено: ${goals.completedGoals}\n`;
    report += `• Средний прогресс: ${goals.averageProgress}%\n\n`;
  } else {
    report += `• Целей пока не установлено\n\n`;
  }
  
  // Достижения
  if (achievements.length > 0) {
    report += `🏆 **ДОСТИЖЕНИЯ**\n`;
    achievements.forEach(achievement => {
      report += `${achievement.emoji} ${achievement.title}\n`;
      report += `   ${achievement.description}\n`;
    });
    report += '\n';
  }
  
  // Рекомендации
  if (recommendations.length > 0) {
    report += `💡 **РЕКОМЕНДАЦИИ**\n`;
    recommendations.forEach((rec, index) => {
      const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      report += `${priority} ${rec.title}\n`;
      report += `   ${rec.text}\n`;
      if (index < recommendations.length - 1) report += '\n';
    });
  }
  
  report += `\n📊 Продолжайте отслеживать прогресс для достижения лучших результатов!`;
  
  return report;
}
