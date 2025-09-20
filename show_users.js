import sqlite3 from 'sqlite3';

async function showUsers() {
    try {
        console.log('📊 Получаю список пользователей из базы данных...\n');
        
        // Открываем базу данных
        const db = new sqlite3.Database('data/subscriptions.db');
        
        // Получаем всех пользователей
        const users = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    telegram_id,
                    username,
                    first_name,
                    last_name,
                    created_at,
                    requests_used,
                    requests_limit,
                    free_requests_used,
                    free_requests_limit,
                    agreement_accepted
                FROM users 
                ORDER BY created_at DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        
        if (users.length === 0) {
            console.log('❌ Пользователи не найдены');
            return;
        }
        
        console.log(`👥 Найдено пользователей: ${users.length}\n`);
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. 👤 ID: ${user.telegram_id}`);
            console.log(`   📝 Имя: ${user.first_name || 'не указано'} ${user.last_name || ''}`);
            console.log(`   🏷️ Username: @${user.username || 'не указан'}`);
            console.log(`   📅 Регистрация: ${user.created_at}`);
            console.log(`   🎯 Запросы: ${user.requests_used || 0}/${user.requests_limit || 0}`);
            console.log(`   🆓 Бесплатные: ${user.free_requests_used || 0}/${user.free_requests_limit || 0}`);
            console.log(`   ✅ Соглашение: ${user.agreement_accepted ? 'принято' : 'не принято'}`);
            console.log('');
        });
        
        // Получаем активные подписки
        console.log('💳 Проверяю активные подписки...\n');
        
        const subscriptions = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    s.user_id,
                    s.status,
                    s.created_at,
                    s.expires_at,
                    s.amount,
                    u.username,
                    u.first_name
                FROM subscriptions s
                JOIN users u ON s.user_id = u.telegram_id
                WHERE s.status = 'active'
                ORDER BY s.created_at DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        
        if (subscriptions.length > 0) {
            console.log(`💰 Активные подписки: ${subscriptions.length}\n`);
            
            subscriptions.forEach((sub, index) => {
                console.log(`${index + 1}. 💳 Пользователь: ${sub.first_name} (@${sub.username})`);
                console.log(`   🆔 ID: ${sub.user_id}`);
                console.log(`   💵 Сумма: ${sub.amount} RUB`);
                console.log(`   📅 Создана: ${sub.created_at}`);
                console.log(`   ⏰ Истекает: ${sub.expires_at}`);
                console.log('');
            });
        } else {
            console.log('❌ Активные подписки не найдены');
        }
        
        await db.close();
        
    } catch (error) {
        console.error('❌ Ошибка при получении пользователей:', error.message);
    }
}

showUsers();