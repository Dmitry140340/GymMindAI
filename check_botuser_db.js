import sqlite3 from 'sqlite3';

async function checkBotUserDatabase() {
    try {
        console.log('🔍 Проверяю базу данных botuser...\n');
        
        const db = new sqlite3.Database('/home/botuser/GymMindAI/data/subscriptions.db');
        
        // Проверяем пользователей
        console.log('👥 Пользователи в базе botuser:');
        const users = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM users ORDER BY created_at DESC", (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        
        if (users.length === 0) {
            console.log('❌ Пользователи не найдены');
        } else {
            console.log(`\n📈 Всего пользователей: ${users.length}\n`);
            
            users.forEach((user, index) => {
                console.log(`${index + 1}. 👤 ID: ${user.telegram_id}`);
                console.log(`   📝 Имя: ${user.first_name || 'не указано'}`);
                console.log(`   🏷️ Username: @${user.username || 'не указан'}`);
                console.log(`   📅 Регистрация: ${user.created_at}`);
                console.log(`   🕐 Последняя активность: ${user.last_activity || 'не было'}`);
                if (user.free_requests_limit !== null) {
                    console.log(`   🆓 Бесплатные запросы: ${user.free_requests_used || 0}/${user.free_requests_limit}`);
                }
                if (user.requests_limit !== null) {
                    console.log(`   🎯 Платные запросы: ${user.requests_used || 0}/${user.requests_limit}`);
                }
                console.log(`   ✅ Соглашение: ${user.agreement_accepted ? 'принято' : 'не принято'}`);
                console.log('');
            });
        }
        
        // Проверяем подписки
        console.log('💳 Подписки:');
        const subscriptions = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM subscriptions ORDER BY created_at DESC", (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        
        if (subscriptions.length === 0) {
            console.log('❌ Подписки не найдены');
        } else {
            console.log(`\n💰 Всего подписок: ${subscriptions.length}\n`);
            
            subscriptions.forEach((sub, index) => {
                console.log(`${index + 1}. 🆔 User ID: ${sub.user_id}`);
                console.log(`   💵 Статус: ${sub.status}`);
                console.log(`   📦 Тип: ${sub.plan_type}`);
                console.log(`   💰 Сумма: ${sub.amount} RUB`);
                console.log(`   📅 Создана: ${sub.created_at}`);
                if (sub.start_date) console.log(`   🚀 Начало: ${sub.start_date}`);
                if (sub.end_date) console.log(`   ⏰ Окончание: ${sub.end_date}`);
                if (sub.payment_id) console.log(`   🧾 Payment ID: ${sub.payment_id}`);
                console.log('');
            });
        }
        
        // Проверяем таблицы workout если есть
        try {
            const workouts = await new Promise((resolve, reject) => {
                db.all("SELECT COUNT(*) as count FROM workouts", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows[0].count);
                });
            });
            
            if (workouts > 0) {
                console.log(`💪 Тренировок записано: ${workouts}`);
            }
        } catch (e) {
            console.log('ℹ️ Таблица workouts не найдена или пуста');
        }
        
        db.close();
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

checkBotUserDatabase();