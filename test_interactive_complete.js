import dotenv from 'dotenv';
dotenv.config();

class CozeInteractiveWorkflowTester {
    constructor() {
        this.apiKey = process.env.COZE_API_KEY;
        this.botId = process.env.COZE_BOT_ID;
        this.baseURL = 'https://api.coze.com/v1';
    }

    // Запуск интерактивного workflow
    async startWorkflow(workflowId, parameters) {
        console.log('🚀 Запускаем интерактивный workflow:', workflowId);
        console.log('📦 Параметры:', parameters);

        try {
            const response = await fetch(`${this.baseURL}/workflow/stream_run`, {
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

            console.log('📥 Workflow start response status:', response.status);

            if (!response.ok) {
                const error = await response.text();
                console.log('❌ Workflow start error:', error);
                return null;
            }

            return this.processStream(response);

        } catch (error) {
            console.error('❌ Workflow start exception:', error.message);
            return null;
        }
    }

    // Продолжение интерактивного workflow
    async resumeWorkflow(eventId, userAnswer, workflowId) {
        console.log('🔄 Продолжаем workflow с eventId:', eventId);
        console.log('💬 Ответ пользователя:', userAnswer);

        try {
            const response = await fetch(`${this.baseURL}/workflow/stream_resume`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    event_id: eventId,
                    resume_data: userAnswer,  
                    interrupt_type: 2,       
                    workflow_id: workflowId, // Добавляем workflow_id
                    bot_id: this.botId       // Добавляем bot_id
                })
            });

            console.log('📥 Workflow resume response status:', response.status);

            if (!response.ok) {
                const error = await response.text();
                console.log('❌ Workflow resume error:', error);
                return null;
            }

            return this.processStream(response);

        } catch (error) {
            console.error('❌ Workflow resume exception:', error.message);
            return null;
        }
    }

    // Обработка streaming ответа
    async processStream(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let messages = [];
        let eventId = null;
        let isComplete = false;

        try {
            let inactiveCount = 0;
            const maxInactive = 10; // Максимум 10 секунд ожидания
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log('📡 Stream ended');
                    break;
                }

                if (value.length === 0) {
                    inactiveCount++;
                    if (inactiveCount > maxInactive) {
                        console.log('⏱️ Timeout waiting for data');
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
                
                inactiveCount = 0; // Сбрасываем счетчик при получении данных
                buffer += decoder.decode(value, { stream: true });
                
                // Обрабатываем все полные события в буфере
                while (buffer.includes('\n\n')) {
                    const eventEnd = buffer.indexOf('\n\n');
                    const eventData = buffer.slice(0, eventEnd);
                    buffer = buffer.slice(eventEnd + 2);
                    
                    console.log('🔍 Processing event:', eventData);
                    const result = this.parseSSEEvent(eventData);
                    if (result) {
                        if (result.type === 'message') {
                            messages.push(result.content);
                            console.log('💬 Получено сообщение:', result.content.substring(0, 150) + '...');
                        } else if (result.type === 'interrupt') {
                            eventId = result.eventId;
                            console.log('⏸️ Workflow требует ответа, eventId:', eventId);
                        } else if (result.type === 'done') {
                            isComplete = true;
                            console.log('✅ Workflow завершен');
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Stream processing error:', error.message);
        }

        return {
            messages: messages.join('\n'),
            eventId,
            isComplete,
            success: true
        };
    }

    // Парсинг полного SSE события
    parseSSEEvent(eventText) {
        const lines = eventText.split('\n');
        let eventType = null;
        let data = null;
        
        for (const line of lines) {
            if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
                data = line.slice(6).trim();
            }
        }
        
        if (data) {
            try {
                const parsed = JSON.parse(data);
                
                if (parsed.content && parsed.content.length > 5) {
                    return {
                        type: 'message',
                        content: parsed.content
                    };
                }
                
                if (parsed.interrupt_data && parsed.interrupt_data.event_id) {
                    return {
                        type: 'interrupt',
                        eventId: parsed.interrupt_data.event_id
                    };
                }
                
                if (eventType === 'Done' || parsed.status === 'completed') {
                    return {
                        type: 'done'
                    };
                }
                
            } catch (error) {
                console.log('⚠️ Parse error for:', data);
            }
        }
        return null;
    }
}

async function testCompleteInteractiveWorkflow() {
    console.log('🏋️‍♂️ ПОЛНЫЙ ТЕСТ ИНТЕРАКТИВНОГО WORKFLOW');
    console.log('========================================');
    
    const tester = new CozeInteractiveWorkflowTester();
    
    // Параметры для программы тренировок
    const params = {
        workout_goal: "набор мышечной массы",
        experience_level: "средний",
        available_days: "4",
        session_duration: "60-90 минут",
        equipment: "полный спортзал",
        limitations: "нет ограничений",
        current_weight: "75",
        target_weight: "85",
        height: "180",
        user_id: "999999999",
        request_type: "training_program"
    };
    
    console.log('\n🎯 ШАГ 1: Запускаем workflow');
    console.log('===========================');
    
    const startResult = await tester.startWorkflow(
        process.env.COZE_TRAINING_PROGRAM_WORKFLOW_ID,
        params
    );
    
    if (!startResult || !startResult.eventId) {
        console.log('❌ Не удалось запустить workflow или получить eventId');
        return;
    }
    
    console.log('✅ Workflow запущен, получен eventId:', startResult.eventId);
    console.log('💬 Вопрос от workflow:', startResult.messages);
    
    // Ответы на все вопросы
    const answers = `1. Моя основная цель: набор мышечной массы
2. Мой уровень подготовки: средний  
3. Мой возраст: 25 лет
4. Пол: мужской
5. Предпочтения: силовые тренировки, базовые упражнения (жим штанги, приседания, становая тяга)
6. Ограничения: нет ограничений по здоровью, есть доступ к полному спортзалу`;

    console.log('\n🎯 ШАГ 2: Отвечаем на вопросы');
    console.log('=============================');
    console.log('📝 Наши ответы:', answers);
    
    const resumeResult = await tester.resumeWorkflow(
        startResult.eventId, 
        answers,
        process.env.COZE_TRAINING_PROGRAM_WORKFLOW_ID
    );
    
    if (resumeResult && resumeResult.success) {
        console.log('\n✅ РЕЗУЛЬТАТ ПРОГРАММЫ ТРЕНИРОВОК:');
        console.log('=================================');
        console.log('📊 Полученная программа:', resumeResult.messages);
        console.log('🔄 Workflow завершен:', resumeResult.isComplete);
        
        if (resumeResult.eventId) {
            console.log('💡 Есть еще вопросы, eventId:', resumeResult.eventId);
        }
    } else {
        console.log('❌ Не удалось получить программу тренировок');
    }
    
    console.log('\n✅ ТЕСТ ЗАВЕРШЕН');
}

testCompleteInteractiveWorkflow().catch(console.error);
