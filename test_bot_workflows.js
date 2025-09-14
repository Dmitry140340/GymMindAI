import { runWorkflow } from './src/services/coze_new.js';
import dotenv from 'dotenv';

dotenv.config();

async function testBotWorkflows() {
    console.log('🤖 ТЕСТИРОВАНИЕ WORKFLOW ЧЕРЕЗ СЕРВИС БОТА');
    console.log('===========================================');
    
    // Проверяем переменные окружения
    console.log('🔑 COZE_API_KEY:', !!process.env.COZE_API_KEY);
    console.log('🤖 COZE_BOT_ID:', process.env.COZE_BOT_ID);
    console.log('⚡ COZE_TRAINING_PROGRAM_WORKFLOW_ID:', process.env.COZE_TRAINING_PROGRAM_WORKFLOW_ID);
    console.log('🥗 COZE_NUTRITION_PLAN_WORKFLOW_ID:', process.env.COZE_NUTRITION_PLAN_WORKFLOW_ID);
    console.log('🔬 COZE_DEEP_RESEARCH_WORKFLOW_ID:', process.env.COZE_DEEP_RESEARCH_WORKFLOW_ID);
    console.log('🧪 COZE_COMPOSITION_ANALYSIS_WORKFLOW_ID:', process.env.COZE_COMPOSITION_ANALYSIS_WORKFLOW_ID);
    
    console.log('\n⏱️ Начало тестирования:', new Date().toLocaleString());
    const testUserId = '999999999';
    
    console.log('\n🏋️‍♂️ ТЕСТ 1: ПРОГРАММА ТРЕНИРОВОК (интерактивный)');
    console.log('===========================================');
    
    const trainingParams = {
        workout_goal: "набор мышечной массы",
        experience_level: "средний",
        available_days: "4",
        session_duration: "60-90 минут",
        equipment: "полный спортзал",
        limitations: "нет ограничений",
        current_weight: "75",
        target_weight: "85",
        height: "180",
        user_id: testUserId,
        request_type: "training_program"
    };
    
    try {
        const trainingResult = await runWorkflow(
            process.env.COZE_TRAINING_PROGRAM_WORKFLOW_ID,
            trainingParams
        );
        
        console.log('📊 Результат программы тренировок:');
        console.log('Success:', trainingResult.success);
        console.log('Interactive:', trainingResult.isInteractive);
        console.log('Event ID:', trainingResult.eventId);
        console.log('Message length:', trainingResult.message?.length || 0);
        
        if (trainingResult.message) {
            console.log('💬 Первые 300 символов:', trainingResult.message.substring(0, 300) + '...');
        }
        
    } catch (error) {
        console.log('❌ Ошибка программы тренировок:', error.message);
    }
    
    console.log('\n🔬 ТЕСТ 2: ГЛУБОКОЕ ИССЛЕДОВАНИЕ (простой)');
    console.log('=========================================');
    
    const researchParams = {
        research_topic: "влияние креатина на спортивные результаты",
        user_id: testUserId,
        research_depth: "подробно",
        include_studies: "да"
    };
    
    try {
        const researchResult = await runWorkflow(
            process.env.COZE_DEEP_RESEARCH_WORKFLOW_ID,
            researchParams
        );
        
        console.log('📊 Результат исследования:');
        console.log('Success:', researchResult.success);
        console.log('Message length:', researchResult.message?.length || 0);
        
        if (researchResult.message) {
            console.log('💬 Первые 300 символов:', researchResult.message.substring(0, 300) + '...');
        }
        
    } catch (error) {
        console.log('❌ Ошибка исследования:', error.message);
    }
    
    console.log('\n🧪 ТЕСТ 3: АНАЛИЗ СОСТАВА (простой)');
    console.log('==================================');
    
    const analysisParams = {
        product_name: "творог 9% жирности",
        analysis_type: "nutritional",
        user_id: testUserId,
        detailed: "да"
    };
    
    try {
        const analysisResult = await runWorkflow(
            process.env.COZE_COMPOSITION_ANALYSIS_WORKFLOW_ID,
            analysisParams
        );
        
        console.log('📊 Результат анализа состава:');
        console.log('Success:', analysisResult.success);
        console.log('Message length:', analysisResult.message?.length || 0);
        
        if (analysisResult.message) {
            console.log('💬 Первые 300 символов:', analysisResult.message.substring(0, 300) + '...');
        }
        
    } catch (error) {
        console.log('❌ Ошибка анализа состава:', error.message);
    }
    
    console.log('\n✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
    console.log('⏱️ Время завершения:', new Date().toLocaleString());
}

testBotWorkflows().catch(console.error);
