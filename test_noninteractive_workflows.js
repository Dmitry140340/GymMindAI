import { runWorkflow } from './src/services/coze_new.js';
import dotenv from 'dotenv';

dotenv.config();

async function testNonInteractiveWorkflows() {
    console.log('🔬 ТЕСТИРОВАНИЕ НЕИНТЕРАКТИВНЫХ WORKFLOW');
    console.log('======================================');
    
    const testUserId = '999999999';
    
    console.log('\n🔬 ТЕСТ: ГЛУБОКОЕ ИССЛЕДОВАНИЕ');
    console.log('=============================');
    
    const researchParams = {
        research_topic: "влияние креатина на спортивные результаты",
        user_id: testUserId,
        research_depth: "подробно",
        include_studies: "да"
    };
    
    try {
        console.log('🚀 Запускаем workflow исследования...');
        const researchResult = await runWorkflow(
            process.env.COZE_DEEP_RESEARCH_WORKFLOW_ID,
            researchParams
        );
        
        console.log('📊 Результат исследования:');
        console.log('✅ Success:', researchResult.success);
        console.log('📝 Message length:', researchResult.message?.length || 0);
        console.log('💭 Error:', researchResult.error || 'нет');
        
        if (researchResult.message) {
            console.log('💬 Первые 500 символов:', researchResult.message.substring(0, 500) + '...');
        }
        
    } catch (error) {
        console.log('❌ Ошибка исследования:', error.message);
    }
    
    console.log('\n🧪 ТЕСТ: АНАЛИЗ СОСТАВА');
    console.log('======================');
    
    const analysisParams = {
        product_name: "творог 9% жирности",
        analysis_type: "nutritional",
        user_id: testUserId,
        detailed: "да"
    };
    
    try {
        console.log('🚀 Запускаем workflow анализа...');
        const analysisResult = await runWorkflow(
            process.env.COZE_COMPOSITION_ANALYSIS_WORKFLOW_ID,
            analysisParams
        );
        
        console.log('📊 Результат анализа состава:');
        console.log('✅ Success:', analysisResult.success);
        console.log('📝 Message length:', analysisResult.message?.length || 0);
        console.log('💭 Error:', analysisResult.error || 'нет');
        
        if (analysisResult.message) {
            console.log('💬 Первые 500 символов:', analysisResult.message.substring(0, 500) + '...');
        }
        
    } catch (error) {
        console.log('❌ Ошибка анализа состава:', error.message);
    }
    
    console.log('\n✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
}

testNonInteractiveWorkflows().catch(console.error);
