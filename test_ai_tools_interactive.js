import dotenv from 'dotenv';
dotenv.config();

class CozeAPIService {
    constructor(apiKey, botId) {
        this.apiKey = apiKey;
        this.botId = botId;
        this.baseURL = 'https://api.coze.com/v1';
    }

    // Метод для ответа на интерактивные вопросы
    async resumeWorkflow(eventId, answer) {
        const url = `${this.baseURL}/workflow/stream_resume`;
        
        console.log('📤 Отправляем ответ на вопрос:', {
            event_id: eventId,
            response: answer
        });

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    event_id: eventId,
                    response: answer
                    // Убираем interrupt_type - возможно, не нужен
                })
            });

            console.log('📥 Resume Workflow API - статус:', response.status);
            
            if (!response.ok) {
                const error = await response.text();
                console.log('❌ Ошибка Resume API:', error);
                return null;
            }

            // Читаем stream ответ
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Сохраняем неполную строку
                
                for (const line of lines) {
                    if (line.trim()) {
                        this.parseSSELine(line);
                    }
                }
            }
            
        } catch (error) {
            console.log('❌ Ошибка Resume Workflow:', error.message);
            return null;
        }
    }

    parseSSELine(line) {
        if (line.startsWith('data: ')) {
            try {
                const data = JSON.parse(line.slice(6));
                console.log('📨 Received:', data);
                
                if (data.content) {
                    console.log('💬 Контент:', data.content.substring(0, 200) + '...');
                }
            } catch (error) {
                console.log('🔍 Raw line:', line);
            }
        }
    }
}

async function testInteractiveWorkflow() {
    console.log('🏋️‍♂️ ИНТЕРАКТИВНОЕ ТЕСТИРОВАНИЕ ПРОГРАММЫ ТРЕНИРОВОК');
    console.log('=====================================================');
    
    const coze = new CozeAPIService(
        process.env.COZE_API_KEY,
        process.env.COZE_BOT_ID
    );
    
    // Event ID из предыдущего теста
    const eventId = '7549604686841741318/67070290456674026';
    
    // Подготовим полный ответ на все вопросы
    const answers = `1. Моя основная цель: набор мышечной массы
2. Мой уровень подготовки: средний
3. Мой возраст: 25 лет
4. Пол: мужской
5. Предпочтения: силовые тренировки, базовые упражнения
6. Ограничения: нет ограничений, полный спортзал доступен`;

    console.log('🎯 Отправляем ответы:', answers);
    
    await coze.resumeWorkflow(eventId, answers);
}

testInteractiveWorkflow();
