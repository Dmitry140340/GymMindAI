import sqlite3 from 'sqlite3';

async function createTestUser() {
    try {
        console.log('👤 Создаю тестового пользователя...\n');
        
        const db = new sqlite3.Database('data/subscriptions.db');
        
        const testUser = {
            telegram_id: 123456789,
            username: 'test_user',
            first_name: 'Test',
            created_at: new Date().toISOString(),
            free_requests_limit: 3,
            free_requests_used: 0,
            agreement_accepted: 1
        };
        
        // Добавляем тестового пользователя
        await new Promise((resolve, reject) => {
            db.run(`
                INSERT OR REPLACE INTO users 
                (telegram_id, username, first_name, created_at, free_requests_limit, free_requests_used, agreement_accepted)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                testUser.telegram_id,
                testUser.username,
                testUser.first_name,
                testUser.created_at,
                testUser.free_requests_limit,
                testUser.free_requests_used,
                testUser.agreement_accepted
            ], function(err) {
                if (err) reject(err);
                else {
                    console.log('✅ Тестовый пользователь создан с ID:', this.lastID);
                    resolve();
                }
            });
        });
        
        // Проверяем результат
        const users = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM users", (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        
        console.log(`\n📊 Всего пользователей в БД: ${users.length}`);
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. 👤 ID: ${user.telegram_id}`);
            console.log(`   📝 Имя: ${user.first_name}`);
            console.log(`   🏷️ Username: @${user.username}`);
            console.log(`   🆓 Бесплатные запросы: ${user.free_requests_used}/${user.free_requests_limit}`);
            console.log(`   ✅ Соглашение: ${user.agreement_accepted ? 'принято' : 'не принято'}`);
            console.log('');
        });
        
        db.close();
        
        console.log('🎯 Теперь бот готов к тестированию!');
        console.log('💬 Напишите боту в Telegram: @FitnessTrainerAI_bot');
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

createTestUser();