import sqlite3 from 'sqlite3';

async function showDatabaseInfo() {
    try {
        console.log('🔍 Анализирую структуру базы данных...\n');
        
        const db = new sqlite3.Database('data/subscriptions.db');
        
        // Получаем структуру таблицы users
        console.log('👥 Структура таблицы users:');
        const usersSchema = await new Promise((resolve, reject) => {
            db.all("PRAGMA table_info(users)", (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        
        usersSchema.forEach(col => {
            console.log(`   ${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.pk ? '- PRIMARY KEY' : ''}`);
        });
        
        console.log('\n📊 Структура таблицы subscriptions:');
        const subsSchema = await new Promise((resolve, reject) => {
            db.all("PRAGMA table_info(subscriptions)", (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        
        subsSchema.forEach(col => {
            console.log(`   ${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.pk ? '- PRIMARY KEY' : ''}`);
        });
        
        // Получаем пользователей с правильными колонками
        console.log('\n👤 Пользователи в системе:');
        const users = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM users ORDER BY created_at DESC LIMIT 10", (err, rows) => {
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
                
                // Показываем все доступные поля
                Object.keys(user).forEach(key => {
                    if (!['telegram_id', 'first_name', 'username', 'created_at'].includes(key)) {
                        console.log(`   ${key}: ${user[key]}`);
                    }
                });
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
                console.log(`   💰 Сумма: ${sub.amount} RUB`);
                console.log(`   📅 Создана: ${sub.created_at}`);
                if (sub.expires_at) {
                    console.log(`   ⏰ Истекает: ${sub.expires_at}`);
                }
                console.log('');
            });
        }
        
        db.close();
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

showDatabaseInfo();