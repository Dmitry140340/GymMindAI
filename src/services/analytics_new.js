import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { getUserMetrics, getUserWorkouts, getUserAchievements } from './database.js';
import fs from 'fs';
import path from 'path';

// Настройка размеров графика
const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

// Создаем папку для временных изображений
const tempDir = './temp';
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Генерация графика веса
export async function generateWeightChart(metrics, userId) {
  if (metrics.length === 0) {
    return null;
  }

  // Сортируем метрики по дате
  const sortedMetrics = metrics.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

  const labels = sortedMetrics.map(record => {
    const date = new Date(record.recorded_at);
    return date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
  });
  
  const data = sortedMetrics.map(record => record.value);

  const configuration = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Вес (кг)',
        data: data,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Динамика веса',
          font: {
            size: 16
          }
        },
        legend: {
          display: true
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: 'Вес (кг)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Дата'
          }
        }
      }
    }
  };

  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  const imagePath = path.join(tempDir, `weight_${userId}_${Date.now()}.png`);
  fs.writeFileSync(imagePath, imageBuffer);
  
  // Планируем удаление файла через 5 минут
  setTimeout(() => {
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }, 5 * 60 * 1000);
  
  return imagePath;
}

// Генерация графика тренировок
export async function generateWorkoutChart(workouts, userId) {
  if (workouts.length === 0) {
    return null;
  }

  // Подсчитываем количество тренировок по типам
  const workoutCounts = {};
  workouts.forEach(workout => {
    const type = workout.workout_type;
    workoutCounts[type] = (workoutCounts[type] || 0) + 1;
  });

  const typeNames = {
    'strength': 'Силовые',
    'cardio': 'Кардио',
    'yoga': 'Йога/Растяжка',
    'functional': 'Функциональные'
  };

  const labels = Object.keys(workoutCounts).map(type => typeNames[type] || type);
  const data = Object.values(workoutCounts);
  const backgroundColors = [
    'rgba(255, 99, 132, 0.8)',
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 205, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)'
  ];

  const configuration = {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        label: 'Количество тренировок',
        data: data,
        backgroundColor: backgroundColors.slice(0, labels.length),
        borderColor: backgroundColors.slice(0, labels.length).map(color => color.replace('0.8', '1')),
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Распределение тренировок по типам',
          font: {
            size: 16
          }
        },
        legend: {
          display: true,
          position: 'bottom'
        }
      }
    }
  };

  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  const imagePath = path.join(tempDir, `workouts_${userId}_${Date.now()}.png`);
  fs.writeFileSync(imagePath, imageBuffer);
  
  // Планируем удаление файла через 5 минут
  setTimeout(() => {
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }, 5 * 60 * 1000);
  
  return imagePath;
}

// Генерация графика прогресса (общая статистика)
export async function generateProgressChart(metrics, workouts, userId) {
  // Создаем комбинированный график с весом и тренировками
  const weightMetrics = metrics.filter(m => m.metric_type === 'weight')
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
  
  // Группируем тренировки по датам
  const workoutsByDate = {};
  workouts.forEach(workout => {
    const date = new Date(workout.created_at).toDateString();
    workoutsByDate[date] = (workoutsByDate[date] || 0) + 1;
  });

  const labels = weightMetrics.map(record => {
    const date = new Date(record.recorded_at);
    return date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
  });
  
  const weightData = weightMetrics.map(record => record.value);
  const workoutData = weightMetrics.map(record => {
    const date = new Date(record.recorded_at).toDateString();
    return workoutsByDate[date] || 0;
  });

  const configuration = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Вес (кг)',
          data: weightData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          yAxisID: 'y',
          tension: 0.1
        },
        {
          label: 'Тренировки (шт)',
          data: workoutData,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          yAxisID: 'y1',
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Прогресс: Вес и Активность',
          font: {
            size: 16
          }
        },
        legend: {
          display: true
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Дата'
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Вес (кг)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Количество тренировок'
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  };

  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  const imagePath = path.join(tempDir, `progress_${userId}_${Date.now()}.png`);
  fs.writeFileSync(imagePath, imageBuffer);
  
  // Планируем удаление файла через 5 минут
  setTimeout(() => {
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }, 5 * 60 * 1000);
  
  return imagePath;
}

// Генерация текстового отчета
export async function generateTextReport(userId) {
  try {
    const [metrics, workouts, achievements] = await Promise.all([
      getUserMetrics(userId),
      getUserWorkouts(userId),
      getUserAchievements(userId)
    ]);

    let report = '';

    // Статистика по весу
    const weightMetrics = metrics.filter(m => m.metric_type === 'weight');
    if (weightMetrics.length > 0) {
      const latestWeight = weightMetrics[0].value;
      const oldestWeight = weightMetrics[weightMetrics.length - 1].value;
      const weightChange = latestWeight - oldestWeight;
      
      report += `📏 Вес: ${latestWeight} кг`;
      if (weightChange !== 0) {
        report += ` (${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} кг)`;
      }
      report += '\n';
    }

    // Статистика по тренировкам
    if (workouts.length > 0) {
      const totalWorkouts = workouts.length;
      const totalCalories = workouts.reduce((sum, w) => sum + (w.calories_burned || 0), 0);
      const totalDuration = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
      
      report += `🏋️‍♂️ Тренировок: ${totalWorkouts}\n`;
      report += `🔥 Калорий сожжено: ${totalCalories}\n`;
      report += `⏱ Общее время: ${Math.round(totalDuration / 60)} ч ${totalDuration % 60} мин\n`;
    }

    // Достижения
    if (achievements.length > 0) {
      report += `🏆 Достижений: ${achievements.length}`;
    }

    return report || 'Пока нет данных для отчета';
    
  } catch (error) {
    console.error('Ошибка генерации текстового отчета:', error);
    return 'Ошибка при генерации отчета';
  }
}
