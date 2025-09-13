import { initDatabase } from '../services/database.js';
import sqlite3 from 'sqlite3';

let db;

async function clearOldWorkouts() {
  try {
    // Инициализируем базу данных
    await initDatabase();
    
    // Подключаемся к базе данных
    db = new sqlite3.Database(process.env.DATABASE_PATH || './data/subscriptions.db');
    
    console.log('🔍 Проверяем существующие записи тренировок...');
    
    // Сначала покажем что у нас есть
    const allWorkouts = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, user_id, workout_type, duration_minutes, workout_details, completed_at 
        FROM workouts 
        ORDER BY completed_at DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`📊 Всего записей тренировок: ${allWorkouts.length}`);
    
    // Подсчитываем старые записи (без workout_details)
    const oldWorkouts = allWorkouts.filter(w => !w.workout_details || w.workout_details === null);
    const detailedWorkouts = allWorkouts.filter(w => w.workout_details && w.workout_details !== null);
    
    console.log(`📋 Записи без деталей (старые): ${oldWorkouts.length}`);
    console.log(`💪 Записи с деталями (новые): ${detailedWorkouts.length}`);
    
    if (oldWorkouts.length > 0) {
      console.log('\n🗑️ Старые записи, которые будут удалены:');
      oldWorkouts.forEach(workout => {
        const date = new Date(workout.completed_at).toLocaleDateString('ru-RU');
        console.log(`   ID: ${workout.id}, User: ${workout.user_id}, Type: ${workout.workout_type}, Date: ${date}`);
      });
      
      // Удаляем старые записи
      const deleteResult = await new Promise((resolve, reject) => {
        db.run(`
          DELETE FROM workouts 
          WHERE workout_details IS NULL OR workout_details = ''
        `, function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      });
      
      console.log(`\n✅ Удалено ${deleteResult} старых записей тренировок`);
    } else {
      console.log('\n✅ Старых записей не найдено');
    }
    
    if (detailedWorkouts.length > 0) {
      console.log('\n💪 Оставшиеся детализированные тренировки:');
      detailedWorkouts.forEach(workout => {
        const date = new Date(workout.completed_at).toLocaleDateString('ru-RU');
        try {
          const details = JSON.parse(workout.workout_details);
          console.log(`   ID: ${workout.id}, User: ${workout.user_id}, Date: ${date}, Exercises: ${details.totalExercises || 0}`);
        } catch (e) {
          console.log(`   ID: ${workout.id}, User: ${workout.user_id}, Date: ${date}, Details: JSON error`);
        }
      });
    }
    
    console.log('\n🎉 Очистка завершена!');
    
  } catch (error) {
    console.error('❌ Ошибка при очистке:', error);
  } finally {
    if (db) {
      db.close();
    }
    process.exit(0);
  }
}

// Запускаем очистку
clearOldWorkouts();
