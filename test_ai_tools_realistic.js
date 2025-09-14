// Реалистичный тест ИИ-инструментов как в боте
import { runWorkflow } from './src/services/coze.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧬 РЕАЛИСТИЧНОЕ ТЕСТИРОВАНИЕ ИИ-ИНСТРУМЕНТОВ');
console.log('==========================================\n');

// Проверим настройки окружения
console.log('📋 Переменные среды:');
console.log('🔑 COZE_API_KEY:', !!process.env.COZE_API_KEY);
console.log('🤖 COZE_BOT_ID:', process.env.COZE_BOT_ID);
console.log('⚡ COZE_TRAINING_PROGRAM_WORKFLOW_ID:', process.env.COZE_TRAINING_PROGRAM_WORKFLOW_ID);
console.log('🥗 COZE_NUTRITION_PLAN_WORKFLOW_ID:', process.env.COZE_NUTRITION_PLAN_WORKFLOW_ID);
console.log('🔬 COZE_DEEP_RESEARCH_WORKFLOW_ID:', process.env.COZE_DEEP_RESEARCH_WORKFLOW_ID);
console.log('🧪 COZE_COMPOSITION_ANALYSIS_WORKFLOW_ID:', process.env.COZE_COMPOSITION_ANALYSIS_WORKFLOW_ID);
console.log('');

const testUserId = '999999999';

// Тест 1: Программа тренировок (как в реальном боте)
async function testTrainingProgram() {
  console.log('🏋️‍♂️ ТЕСТ 1: ПРОГРАММА ТРЕНИРОВОК (как в боте)');
  console.log('===========================================');
  
  try {
    const workflowId = process.env.COZE_TRAINING_PROGRAM_WORKFLOW_ID;
    
    const workflowParameters = {
      workout_goal: 'набор мышечной массы',
      experience_level: 'средний',
      available_days: '4',
      session_duration: '60-90 минут',
      equipment: 'полный спортзал',
      limitations: 'нет ограничений',
      current_weight: '75',
      target_weight: '85',
      height: '180',
      user_id: testUserId,
      request_type: 'training_program'
    };
    
    console.log('🆔 Workflow ID:', workflowId);
    console.log('📦 Параметры:', JSON.stringify(workflowParameters, null, 2));
    console.log('🚀 Запускаем workflow...');
    
    const startTime = Date.now();
    const result = await runWorkflow(workflowId, workflowParameters);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Результат получен за ${duration}ms`);
    console.log('📊 Success:', result.success);
    console.log('📝 Message length:', result.message?.length || 'undefined');
    console.log('💬 Первые 200 символов:', result.message?.substring(0, 200) + '...');
    
    return { success: result.success, duration, result };
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    return { success: false, error: error.message };
  }
}

// Тест 2: План питания
async function testNutritionPlan() {
  console.log('\n🥗 ТЕСТ 2: ПЛАН ПИТАНИЯ (как в боте)');
  console.log('=================================');
  
  try {
    const workflowId = process.env.COZE_NUTRITION_PLAN_WORKFLOW_ID;
    
    const workflowParameters = {
      goal: 'набор мышечной массы',
      weight: '75',
      height: '180',
      age: '28',
      gender: 'мужской',
      activity_level: 'высокая (тренировки 4-5 раз в неделю)',
      allergies: 'нет',
      dietary_restrictions: 'нет',
      preferred_meals: '5',
      budget: 'средний',
      user_id: testUserId,
      request_type: 'nutrition_plan'
    };
    
    console.log('🆔 Workflow ID:', workflowId);
    console.log('📦 Параметры:', JSON.stringify(workflowParameters, null, 2));
    console.log('🚀 Запускаем workflow...');
    
    const startTime = Date.now();
    const result = await runWorkflow(workflowId, workflowParameters);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Результат получен за ${duration}ms`);
    console.log('📊 Success:', result.success);
    console.log('📝 Message length:', result.message?.length || 'undefined');
    console.log('🍽️ Первые 200 символов:', result.message?.substring(0, 200) + '...');
    
    return { success: result.success, duration, result };
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    return { success: false, error: error.message };
  }
}

// Тест 3: Глубокое исследование
async function testDeepResearch() {
  console.log('\n🔬 ТЕСТ 3: ГЛУБОКОЕ ИССЛЕДОВАНИЕ (как в боте)');
  console.log('==========================================');
  
  try {
    const workflowId = process.env.COZE_DEEP_RESEARCH_WORKFLOW_ID;
    
    const workflowParameters = {
      research_query: 'Влияние креатина на спортивные показатели',
      user_id: testUserId,
      request_type: 'deepresearch'
    };
    
    console.log('🆔 Workflow ID:', workflowId);
    console.log('📦 Параметры:', JSON.stringify(workflowParameters, null, 2));
    console.log('🚀 Запускаем workflow...');
    
    const startTime = Date.now();
    const result = await runWorkflow(workflowId, workflowParameters);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Результат получен за ${duration}ms`);
    console.log('📊 Success:', result.success);
    console.log('📝 Message length:', result.message?.length || 'undefined');
    console.log('📚 Первые 200 символов:', result.message?.substring(0, 200) + '...');
    
    return { success: result.success, duration, result };
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    return { success: false, error: error.message };
  }
}

// Тест 4: Анализ состава
async function testCompositionAnalysis() {
  console.log('\n🧪 ТЕСТ 4: АНАЛИЗ СОСТАВА (как в боте)');
  console.log('====================================');
  
  try {
    const workflowId = process.env.COZE_COMPOSITION_ANALYSIS_WORKFLOW_ID;
    
    const workflowParameters = {
      product_name: 'Протеиновый порошок',
      ingredients: 'сывороточный протеин изолят, лецитин, ароматизаторы, стевия',
      nutritional_info: 'белки 25г, углеводы 2г, жиры 1г на порцию 30г',
      purpose: 'набор мышечной массы',
      user_id: testUserId,
      request_type: 'composition_analysis'
    };
    
    console.log('🆔 Workflow ID:', workflowId);
    console.log('📦 Параметры:', JSON.stringify(workflowParameters, null, 2));
    console.log('🚀 Запускаем workflow...');
    
    const startTime = Date.now();
    const result = await runWorkflow(workflowId, workflowParameters);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Результат получен за ${duration}ms`);
    console.log('📊 Success:', result.success);
    console.log('📝 Message length:', result.message?.length || 'undefined');
    console.log('⚗️ Первые 200 символов:', result.message?.substring(0, 200) + '...');
    
    return { success: result.success, duration, result };
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    return { success: false, error: error.message };
  }
}

// Основная функция тестирования
async function runRealisticTests() {
  console.log('⏱️ Начало тестирования:', new Date().toLocaleString());
  console.log('👤 Тестовый пользователь ID:', testUserId);
  console.log('');
  
  const results = {};
  let successCount = 0;
  
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
  console.log('\n🎉 ИТОГОВЫЙ ОТЧЕТ');
  console.log('================');
  console.log(`✅ Успешных тестов: ${successCount}/4`);
  console.log(`⏱️ Время завершения: ${new Date().toLocaleString()}`);
  
  // Детальная статистика
  console.log('\n📊 ДЕТАЛЬНАЯ СТАТИСТИКА:');
  console.log('- 🏋️‍♂️ Программа тренировок:', results.trainingProgram.success ? 
    `✅ ${results.trainingProgram.duration}ms` : 
    `❌ ${results.trainingProgram.error}`);
  console.log('- 🥗 План питания:', results.nutritionPlan.success ? 
    `✅ ${results.nutritionPlan.duration}ms` : 
    `❌ ${results.nutritionPlan.error}`);
  console.log('- 🔬 Глубокое исследование:', results.deepResearch.success ? 
    `✅ ${results.deepResearch.duration}ms` : 
    `❌ ${results.deepResearch.error}`);
  console.log('- 🧪 Анализ состава:', results.compositionAnalysis.success ? 
    `✅ ${results.compositionAnalysis.duration}ms` : 
    `❌ ${results.compositionAnalysis.error}`);
  
  if (successCount === 4) {
    console.log('\n🏆 ВСЕ ИИ-ИНСТРУМЕНТЫ РАБОТАЮТ ОТЛИЧНО!');
  } else {
    console.log(`\n⚠️ ${4 - successCount} инструментов требуют внимания.`);
  }
  
  return results;
}

// Запуск тестов
runRealisticTests().then(() => {
  console.log('\n🏁 Реалистичное тестирование завершено!');
}).catch(error => {
  console.error('💥 Критическая ошибка:', error);
});
