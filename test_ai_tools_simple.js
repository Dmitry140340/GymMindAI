// Упрощенный тест ИИ-инструментов через API
import { runWorkflow } from './src/services/coze.js';

console.log('🧬 ТЕСТИРОВАНИЕ ИИ-ИНСТРУМЕНТОВ (Упрощенная версия)');
console.log('================================================\n');

const testUserId = 999999999;

// Тест 1: Создание программы тренировок
async function testTrainingProgram() {
  console.log('🏋️‍♂️ ТЕСТ 1: СОЗДАНИЕ ПРОГРАММЫ ТРЕНИРОВОК');
  console.log('==========================================');
  
  try {
    const workflowParams = {
      workout_goal: 'набор мышечной массы',
      experience_level: 'средний', 
      available_days: '4',
      session_duration: '60-90 минут',
      equipment: 'полный спортзал',
      limitations: 'нет ограничений',
      current_weight: '75',
      target_weight: '85',
      height: '180'
    };
    
    console.log('📋 Параметры:', JSON.stringify(workflowParams, null, 2));
    console.log('🚀 Запуск воркфлоу...');
    
    const startTime = Date.now();
    const result = await runWorkflow(
      'training_program',
      testUserId,
      JSON.stringify(workflowParams)
    );
    const duration = Date.now() - startTime;
    
    console.log(`✅ Программа создана за ${duration}ms!`);
    console.log('📊 Длина результата:', result.length, 'символов');
    console.log('📝 Первые 300 символов:', result.substring(0, 300) + '...');
    
    return { success: true, duration, length: result.length };
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    return { success: false, error: error.message };
  }
}

// Тест 2: Создание плана питания
async function testNutritionPlan() {
  console.log('\n🥗 ТЕСТ 2: СОЗДАНИЕ ПЛАНА ПИТАНИЯ');
  console.log('===============================');
  
  try {
    const nutritionParams = {
      goal: 'набор мышечной массы',
      weight: '75',
      height: '180',
      age: '28',
      gender: 'мужской',
      activity_level: 'высокая (тренировки 4-5 раз в неделю)',
      allergies: 'нет',
      dietary_restrictions: 'нет',
      preferred_meals: '5',
      budget: 'средний'
    };
    
    console.log('📋 Параметры:', JSON.stringify(nutritionParams, null, 2));
    console.log('🚀 Запуск воркфлоу...');
    
    const startTime = Date.now();
    const result = await runWorkflow(
      'nutrition_plan',
      testUserId,
      JSON.stringify(nutritionParams)
    );
    const duration = Date.now() - startTime;
    
    console.log(`✅ План питания создан за ${duration}ms!`);
    console.log('📊 Длина результата:', result.length, 'символов');
    console.log('🍽️ Первые 300 символов:', result.substring(0, 300) + '...');
    
    return { success: true, duration, length: result.length };
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    return { success: false, error: error.message };
  }
}

// Тест 3: Глубокое исследование
async function testDeepResearch() {
  console.log('\n🔬 ТЕСТ 3: ГЛУБОКОЕ ИССЛЕДОВАНИЕ');
  console.log('==============================');
  
  try {
    const query = 'Влияние креатина на спортивные показатели';
    
    console.log('🔍 Запрос:', query);
    console.log('🚀 Запуск воркфлоу...');
    
    const startTime = Date.now();
    const result = await runWorkflow('deepresearch', testUserId, query);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Исследование выполнено за ${duration}ms!`);
    console.log('📊 Длина результата:', result.length, 'символов');
    console.log('📚 Первые 300 символов:', result.substring(0, 300) + '...');
    
    return { success: true, duration, length: result.length };
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    return { success: false, error: error.message };
  }
}

// Тест 4: Анализ состава
async function testCompositionAnalysis() {
  console.log('\n🧪 ТЕСТ 4: АНАЛИЗ СОСТАВА');
  console.log('=======================');
  
  try {
    const compositionData = {
      product_name: 'Протеиновый порошок',
      ingredients: 'сывороточный протеин изолят, лецитин, ароматизаторы, стевия',
      nutritional_info: 'белки 25г, углеводы 2г, жиры 1г на порцию 30г',
      purpose: 'набор мышечной массы'
    };
    
    console.log('🧪 Данные:', JSON.stringify(compositionData, null, 2));
    console.log('🚀 Запуск воркфлоу...');
    
    const startTime = Date.now();
    const result = await runWorkflow(
      'composition_analysis',
      testUserId,
      JSON.stringify(compositionData)
    );
    const duration = Date.now() - startTime;
    
    console.log(`✅ Анализ выполнен за ${duration}ms!`);
    console.log('📊 Длина результата:', result.length, 'символов');
    console.log('⚗️ Первые 300 символов:', result.substring(0, 300) + '...');
    
    return { success: true, duration, length: result.length };
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    return { success: false, error: error.message };
  }
}

// Основная функция тестирования
async function runAllTests() {
  const results = {};
  let successCount = 0;
  
  console.log('⏱️ Начало тестирования:', new Date().toLocaleString());
  console.log('👤 Тестовый пользователь ID:', testUserId);
  console.log('');
  
  // Пауза для стабилизации
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Тест 1: Программа тренировок
  results.trainingProgram = await testTrainingProgram();
  if (results.trainingProgram.success) successCount++;
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Тест 2: План питания
  results.nutritionPlan = await testNutritionPlan();
  if (results.nutritionPlan.success) successCount++;
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Тест 3: Глубокое исследование
  results.deepResearch = await testDeepResearch();
  if (results.deepResearch.success) successCount++;
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Тест 4: Анализ состава
  results.compositionAnalysis = await testCompositionAnalysis();
  if (results.compositionAnalysis.success) successCount++;
  
  // Итоговый отчет
  console.log('\n🎉 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ');
  console.log('=============================');
  console.log(`✅ Успешных тестов: ${successCount}/4`);
  console.log(`⏱️ Время завершения: ${new Date().toLocaleString()}`);
  
  // Детальная статистика
  console.log('\n📊 ДЕТАЛЬНАЯ СТАТИСТИКА:');
  console.log('- 🏋️‍♂️ Программа тренировок:', results.trainingProgram.success ? 
    `✅ ${results.trainingProgram.duration}ms, ${results.trainingProgram.length} символов` : 
    `❌ ${results.trainingProgram.error}`);
    
  console.log('- 🥗 План питания:', results.nutritionPlan.success ? 
    `✅ ${results.nutritionPlan.duration}ms, ${results.nutritionPlan.length} символов` : 
    `❌ ${results.nutritionPlan.error}`);
    
  console.log('- 🔬 Глубокое исследование:', results.deepResearch.success ? 
    `✅ ${results.deepResearch.duration}ms, ${results.deepResearch.length} символов` : 
    `❌ ${results.deepResearch.error}`);
    
  console.log('- 🧪 Анализ состава:', results.compositionAnalysis.success ? 
    `✅ ${results.compositionAnalysis.duration}ms, ${results.compositionAnalysis.length} символов` : 
    `❌ ${results.compositionAnalysis.error}`);
  
  if (successCount === 4) {
    console.log('\n🏆 ВСЕ ИИ-ИНСТРУМЕНТЫ РАБОТАЮТ ОТЛИЧНО!');
  } else {
    console.log(`\n⚠️ ${4 - successCount} инструментов требуют внимания.`);
  }
  
  return results;
}

// Запуск
runAllTests().then(() => {
  console.log('\n🏁 Тестирование завершено!');
}).catch(error => {
  console.error('💥 Критическая ошибка:', error);
});
