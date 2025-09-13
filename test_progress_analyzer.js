/**
 * 🧪 Тест модуля анализа прогресса
 */

import { analyzeUserProgress, formatProgressReport } from './src/services/progress-analyzer.js';

console.log('🧪 Тестирование модуля анализа прогресса...\n');

// Тестируем с реальным пользователем (если есть)
const testUserId = 1158662; // ID из тестов

async function testProgressAnalyzer() {
  try {
    console.log('📊 Анализируем прогресс пользователя...');
    
    const result = await analyzeUserProgress(testUserId);
    
    if (result.success) {
      console.log('✅ Анализ прогресса успешен!');
      console.log('\n📋 Данные прогресса:');
      console.log('- Пользователь:', result.data.user);
      console.log('- Вес:', result.data.weight.status);
      console.log('- Тренировки:', result.data.workouts.status);
      console.log('- Цели:', result.data.goals.status);
      console.log('- Общий балл:', result.data.overallScore);
      console.log('- Рекомендации:', result.data.recommendations.length);
      console.log('- Достижения:', result.data.achievements.length);
      
      console.log('\n📄 Форматированный отчет:');
      const report = formatProgressReport(result.data);
      console.log(report.substring(0, 500) + '...');
      
    } else {
      console.log('❌ Ошибка анализа:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

// Запускаем тест
testProgressAnalyzer().then(() => {
  console.log('\n🎯 Тестирование завершено!');
});
