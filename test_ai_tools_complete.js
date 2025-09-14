import dotenv from 'dotenv';
dotenv.config();

class CozeAPIService {
    constructor(apiKey, botId) {
        this.apiKey = apiKey;
        this.botId = botId;
        this.baseURL = 'https://api.coze.com/v1';
    }

    // Запуск workflow с полными параметрами (неинтерактивно)
    async runWorkflowComplete(workflowId, parameters) {
        const url = `${this.baseURL}/workflow/stream_run`;
        
        console.log('📤 Запускаем полный workflow:', {
            workflow_id: workflowId,
            parameters
        });

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    workflow_id: workflowId,
                    parameters: parameters,
                    bot_id: this.botId
                })
            });

            console.log('📥 Workflow API - статус:', response.status);
            
            if (!response.ok) {
                const error = await response.text();
                console.log('❌ Ошибка Workflow API:', error);
                return null;
            }

            // Читаем stream ответ
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullContent = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();
                
                for (const line of lines) {
                    if (line.trim()) {
                        const content = this.parseSSELine(line);
                        if (content) {
                            fullContent += content + '\n';
                        }
                    }
                }
            }
            
            return fullContent;
            
        } catch (error) {
            console.log('❌ Ошибка Workflow:', error.message);
            return null;
        }
    }

    parseSSELine(line) {
        if (line.startsWith('data: ')) {
            try {
                const data = JSON.parse(line.slice(6));
                
                if (data.content && data.node_title !== 'Question') {
                    console.log(`📨 [${data.node_title}]:`, data.content.substring(0, 150) + '...');
                    return data.content;
                }
                
                if (data.error_code) {
                    console.log('❌ Ошибка:', data.error_message);
                }
                
            } catch (error) {
                // Игнорируем ошибки парсинга
            }
        }
        return null;
    }
}

async function testCompleteWorkflow() {
    console.log('🏋️‍♂️ ПОЛНОЕ ТЕСТИРОВАНИЕ ПРОГРАММЫ ТРЕНИРОВОК');
    console.log('===============================================');
    
    const coze = new CozeAPIService(
        process.env.COZE_API_KEY,
        process.env.COZE_BOT_ID
    );
    
    // Полные параметры для получения программы тренировок
    const parameters = {
        workout_goal: "набор мышечной массы",
        experience_level: "средний", 
        available_days: "4",
        session_duration: "60-90 минут",
        equipment: "полный спортзал",
        limitations: "нет ограничений",
        current_weight: "75",
        target_weight: "85",
        height: "180",
        age: "25",
        gender: "мужской",
        preferences: "силовые тренировки, базовые упражнения",
        user_id: "999999999",
        request_type: "training_program",
        // Попробуем добавить готовые ответы
        user_answers: "1. набор мышечной массы\n2. средний\n3. 25 лет\n4. мужской\n5. силовые тренировки\n6. нет ограничений"
    };
    
    console.log('⚡ Запускаем workout workflow с полными параметрами...');
    const result = await coze.runWorkflowComplete(
        process.env.COZE_TRAINING_PROGRAM_WORKFLOW_ID,
        parameters
    );
    
    if (result) {
        console.log('\n✅ ПРОГРАММА ТРЕНИРОВОК ПОЛУЧЕНА:');
        console.log('================================');
        console.log(result);
    } else {
        console.log('❌ Не удалось получить программу тренировок');
    }
}

testCompleteWorkflow();
