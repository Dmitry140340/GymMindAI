// Полноценный тест ИИ-инструментов бота
import { runWorkflow, getConversationId, clearConversation } from './src/services/coze.js';
import { createOrUpdateUser, getUserByTelegramId } from './src/services/database.js';

console.log('🧬 ТЕСТИРОВАНИЕ ИИ-ИНСТРУМЕНТОВ');
console.log('==============================\n');

// Тестовые данные пользователя
const testUser = {
  id: 999999999,
  first_name: 'Тестовый',
  last_name: 'Пользователь',
  username: 'test_user'
};

// Создаем тестового пользователя
async function setupTestUser() {
  console.log('👤 Создание тестового пользователя...');
  try {
    await createOrUpdateUser(testUser);
    const dbUser = await getUserByTelegramId(testUser.id);
    console.log('✅ Тестовый пользователь создан:', dbUser.username);
    return dbUser;
  } catch (error) {
    console.error('❌ Ошибка создания пользователя:', error);
    throw error;
  }
}

// Тест 1: Создание программы тренировок
async function testTrainingProgram() {
  console.log('\n🏋️‍♂️ ТЕСТ 1: СОЗДАНИЕ ПРОГРАММЫ ТРЕНИРОВОК');
  console.log('==========================================');
  
  try {
    console.log('🚀 Запуск воркфлоу training_program...');
    
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
    
    console.log('📋 Параметры программы:', JSON.stringify(workflowParams, null, 2));
    
    const result = await runWorkflow(
      'training_program',
      testUser.id,
      JSON.stringify(workflowParams)
    );
    
    console.log('✅ Программа тренировок создана!');
    console.log('📊 Результат:', result.substring(0, 500) + '...');
    
    return result;
    
  } catch (error) {
    console.error('❌ Ошибка создания программы тренировок:', error);
    throw error;
  }
}

// Тест 2: Создание плана питания
async function testNutritionPlan() {
  console.log('\n🥗 ТЕСТ 2: СОЗДАНИЕ ПЛАНА ПИТАНИЯ');
  console.log('===============================');
  
  try {
    console.log('🚀 Запуск воркфлоу nutrition_plan...');
    
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
      budget: 'средний',
      cooking_time: '30-60 минут в день'
    };
    
    console.log('📋 Параметры питания:', JSON.stringify(nutritionParams, null, 2));
    
    const result = await runWorkflow(
      'nutrition_plan',
      testUser.id,
      JSON.stringify(nutritionParams)
    );
    
    console.log('✅ План питания создан!');
    console.log('🍽️ Результат:', result.substring(0, 500) + '...');
    
    return result;
    
  } catch (error) {
    console.error('❌ Ошибка создания плана питания:', error);
    throw error;
  }
}

// Тест 3: Глубокое исследование
async function testDeepResearch() {
  console.log('\n🔬 ТЕСТ 3: ГЛУБОКОЕ ИССЛЕДОВАНИЕ');
  console.log('==============================');
  
  try {
    console.log('🚀 Запуск воркфлоу deepresearch...');
    
    const researchQuery = 'Влияние креатина на спортивные показатели и безопасность длительного применения';
    
    console.log('🔍 Тема исследования:', researchQuery);
    
    const result = await runWorkflow(
      'deepresearch',
      testUser.id,
      researchQuery
    );
    
    console.log('✅ Исследование выполнено!');
    console.log('📚 Результат:', result.substring(0, 500) + '...');
    
    return result;
    
  } catch (error) {
    console.error('❌ Ошибка выполнения исследования:', error);
    throw error;
  }
}

// Тест 4: Анализ состава
async function testCompositionAnalysis() {
  console.log('\n🧪 ТЕСТ 4: АНАЛИЗ СОСТАВА');
  console.log('=======================');
  
  try {
    console.log('🚀 Запуск воркфлоу composition_analysis...');
    
    const compositionData = {
      product_name: 'Протеиновый порошок XYZ',
      ingredients: 'сывороточный протеин изолят, лецитин, натуральные ароматизаторы, стевия, цикламат натрия',
      nutritional_info: 'белки 25г, углеводы 2г, жиры 1г на порцию 30г',
      purpose: 'набор мышечной массы'
    };
    
    console.log('🧪 Данные для анализа:', JSON.stringify(compositionData, null, 2));
    
    const result = await runWorkflow(
      'composition_analysis',
      testUser.id,
      JSON.stringify(compositionData)
    );
    
    console.log('✅ Анализ состава выполнен!');
    console.log('⚗️ Результат:', result.substring(0, 500) + '...');
    
    return result;
    
  } catch (error) {
    console.error('❌ Ошибка анализа состава:', error);
    throw error;
  }
}

// Тест 5: Проверка conversation management
async function testConversationManagement() {
  console.log('\n💬 ТЕСТ 5: УПРАВЛЕНИЕ ДИАЛОГАМИ');
  console.log('=============================');
  
  try {
    console.log('🆔 Получение ID диалога...');
    const conversationId = await getConversationId(testUser.id);
    console.log('✅ ID диалога:', conversationId);
    
    console.log('🧹 Очистка диалога...');
    await clearConversation(testUser.id);
    console.log('✅ Диалог очищен');
    
    const newConversationId = await getConversationId(testUser.id);
    console.log('🆔 Новый ID диалога:', newConversationId);
    
    return { oldId: conversationId, newId: newConversationId };
    
  } catch (error) {
    console.error('❌ Ошибка управления диалогами:', error);
    throw error;
  }
}

// Основная функция тестирования
async function runAllTests() {
  const testResults = {
    setup: null,
    trainingProgram: null,
    nutritionPlan: null,
    deepResearch: null,
    compositionAnalysis: null,
    conversationManagement: null
  };
  
  try {
    // Настройка
    testResults.setup = await setupTestUser();
    
    // Тест программы тренировок
    testResults.trainingProgram = await testTrainingProgram();
    
    // Пауза между тестами
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Тест плана питания
    testResults.nutritionPlan = await testNutritionPlan();
    
    // Пауза между тестами
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Тест глубокого исследования
    testResults.deepResearch = await testDeepResearch();
    
    // Пауза между тестами
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Тест анализа состава
    testResults.compositionAnalysis = await testCompositionAnalysis();
    
    // Тест управления диалогами
    testResults.conversationManagement = await testConversationManagement();
    
    // Итоговый отчет
    console.log('\n🎉 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ');
    console.log('=============================');
    
    const successCount = Object.values(testResults).filter(result => result !== null).length;
    console.log(`✅ Успешных тестов: ${successCount}/6`);
    
    if (successCount === 6) {
      console.log('🏆 ВСЕ ИИ-ИНСТРУМЕНТЫ РАБОТАЮТ КОРРЕКТНО!');
    } else {
      console.log('⚠️ Некоторые тесты не прошли. Проверьте логи выше.');
    }
    
    // Детальная статистика
    console.log('\n📊 ДЕТАЛЬНАЯ СТАТИСТИКА:');
    console.log('- 👤 Создание пользователя:', testResults.setup ? '✅' : '❌');
    console.log('- 🏋️‍♂️ Программа тренировок:', testResults.trainingProgram ? '✅' : '❌');
    console.log('- 🥗 План питания:', testResults.nutritionPlan ? '✅' : '❌');
    console.log('- 🔬 Глубокое исследование:', testResults.deepResearch ? '✅' : '❌');
    console.log('- 🧪 Анализ состава:', testResults.compositionAnalysis ? '✅' : '❌');
    console.log('- 💬 Управление диалогами:', testResults.conversationManagement ? '✅' : '❌');
    
  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА ТЕСТИРОВАНИЯ:', error);
    process.exit(1);
  }
}

// Запуск тестов
runAllTests().then(() => {
  console.log('\n🏁 Тестирование завершено!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Фатальная ошибка:', error);
  process.exit(1);
});
