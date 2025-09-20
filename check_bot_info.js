import axios from 'axios';

async function checkBotInfo() {
    try {
        const token = '8128410187:AAG0B0lsF65xnH0X3Ld2M7IqMK4OlLuK_Y8';
        
        console.log('🤖 Проверяю информацию о боте...\n');
        
        const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
        
        if (response.data.ok) {
            const bot = response.data.result;
            console.log('✅ Бот найден!');
            console.log(`🆔 ID: ${bot.id}`);
            console.log(`👤 Имя: ${bot.first_name}`);
            console.log(`🏷️ Username: @${bot.username}`);
            console.log(`🔗 Ссылка: https://t.me/${bot.username}`);
            
            console.log('\n📋 Проверяю настройки в .env:');
            console.log(`🔧 TELEGRAM_BOT_USERNAME должен быть: ${bot.username}`);
            console.log(`🔧 return_url должен использовать: https://t.me/${bot.username}`);
            
        } else {
            console.log('❌ Ошибка получения информации о боте:', response.data);
        }
        
    } catch (error) {
        console.error('❌ Ошибка:', error.response?.data || error.message);
    }
}

checkBotInfo();