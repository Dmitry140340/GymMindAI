import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

let db;

// Генерация токена доступа
function generateAccessToken(userId, paymentId) {
  const data = `${userId}-${paymentId}-${Date.now()}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

// Инициализация базы данных
export async function initDatabase() {
  return new Promise((resolve, reject) => {
    // Создаем папку data если её нет
    const dataDir = path.dirname(process.env.DATABASE_PATH || './data/subscriptions.db');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new sqlite3.Database(process.env.DATABASE_PATH || './data/subscriptions.db', (err) => {
      if (err) {
        console.error('Ошибка подключения к базе данных:', err);
        reject(err);
        return;
      }
      
      console.log('✅ Подключение к базе данных установлено');
      
      // Создаем таблицы
      db.serialize(() => {
        // Таблица пользователей
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            telegram_id INTEGER UNIQUE NOT NULL,
            username TEXT,
            first_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Таблица подписок
        db.run(`
          CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            plan_type TEXT NOT NULL, -- 'monthly' или 'yearly'
            status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'expired', 'cancelled'
            start_date DATETIME,
            end_date DATETIME,
            payment_id TEXT,
            amount REAL,
            access_token TEXT UNIQUE, -- уникальный токен доступа
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
          )
        `);

        // Миграция: добавляем колонку access_token если её нет
        db.run(`PRAGMA table_info(subscriptions)`, (err, rows) => {
          if (!err) {
            // Проверяем, есть ли колонка access_token
            db.all(`PRAGMA table_info(subscriptions)`, (pragmaErr, columns) => {
              if (!pragmaErr && columns) {
                const hasAccessToken = columns.some(col => col.name === 'access_token');
                
                if (!hasAccessToken) {
                  // Добавляем колонку без UNIQUE ограничения (так как SQLite не поддерживает добавление UNIQUE через ALTER)
                  db.run(`ALTER TABLE subscriptions ADD COLUMN access_token TEXT`, (alterErr) => {
                    if (alterErr) {
                      console.log('Ошибка добавления колонки access_token:', alterErr.message);
                    } else {
                      console.log('✅ Добавлена колонка access_token в таблицу subscriptions');
                    }
                  });
                } else {
                  console.log('✅ Колонка access_token уже существует');
                }
              }
            });
          }
        });

        // Миграция: добавляем поля для отслеживания запросов
        db.all(`PRAGMA table_info(subscriptions)`, (pragmaErr, columns) => {
          if (!pragmaErr && columns) {
            const hasRequestsLimit = columns.some(col => col.name === 'requests_limit');
            const hasRequestsUsed = columns.some(col => col.name === 'requests_used');
            
            if (!hasRequestsLimit) {
              db.run(`ALTER TABLE subscriptions ADD COLUMN requests_limit INTEGER DEFAULT 100`, (alterErr) => {
                if (alterErr) {
                  console.log('Ошибка добавления колонки requests_limit:', alterErr.message);
                } else {
                  console.log('✅ Добавлена колонка requests_limit в таблицу subscriptions');
                }
              });
            } else {
              console.log('✅ Колонка requests_limit уже существует');
            }

            if (!hasRequestsUsed) {
              db.run(`ALTER TABLE subscriptions ADD COLUMN requests_used INTEGER DEFAULT 0`, (alterErr) => {
                if (alterErr) {
                  console.log('Ошибка добавления колонки requests_used:', alterErr.message);
                } else {
                  console.log('✅ Добавлена колонка requests_used в таблицу subscriptions');
                }
              });
            } else {
              console.log('✅ Колонка requests_used уже существует');
            }
          }
        });

        // Миграция: добавляем поля для бесплатных запросов в таблицу users
        db.all(`PRAGMA table_info(users)`, (pragmaErr, columns) => {
          if (!pragmaErr && columns) {
            const hasFreeRequestsLimit = columns.some(col => col.name === 'free_requests_limit');
            const hasFreeRequestsUsed = columns.some(col => col.name === 'free_requests_used');
            
            if (!hasFreeRequestsLimit) {
              db.run(`ALTER TABLE users ADD COLUMN free_requests_limit INTEGER DEFAULT 7`, (alterErr) => {
                if (alterErr) {
                  console.log('Ошибка добавления колонки free_requests_limit:', alterErr.message);
                } else {
                  console.log('✅ Добавлена колонка free_requests_limit в таблицу users');
                }
              });
            } else {
              console.log('✅ Колонка free_requests_limit уже существует');
            }

            if (!hasFreeRequestsUsed) {
              db.run(`ALTER TABLE users ADD COLUMN free_requests_used INTEGER DEFAULT 0`, (alterErr) => {
                if (alterErr) {
                  console.log('Ошибка добавления колонки free_requests_used:', alterErr.message);
                } else {
                  console.log('✅ Добавлена колонка free_requests_used в таблицу users');
                }
              });
            } else {
              console.log('✅ Колонка free_requests_used уже существует');
            }
          }
        });

        // Миграция: добавляем колонку agreement_accepted в таблицу users
        db.all(`PRAGMA table_info(users)`, (pragmaErr, columns) => {
          if (!pragmaErr && columns) {
            const hasAgreementAccepted = columns.some(col => col.name === 'agreement_accepted');
            
            if (!hasAgreementAccepted) {
              db.run(`ALTER TABLE users ADD COLUMN agreement_accepted BOOLEAN DEFAULT 0`, (alterErr) => {
                if (alterErr) {
                  console.log('Ошибка добавления колонки agreement_accepted:', alterErr.message);
                } else {
                  console.log('✅ Добавлена колонка agreement_accepted в таблицу users');
                }
              });
            } else {
              console.log('✅ Колонка agreement_accepted уже существует');
            }
          }
        });

        // Миграция: исправляем схему таблицы workouts (заменяем workout_date на completed_at)
        db.all(`PRAGMA table_info(workouts)`, (pragmaErr, columns) => {
          if (!pragmaErr && columns) {
            const hasWorkoutDate = columns.some(col => col.name === 'workout_date');
            const hasCompletedAt = columns.some(col => col.name === 'completed_at');
            
            if (hasWorkoutDate && !hasCompletedAt) {
              console.log('🔄 Выполняем миграцию таблицы workouts: workout_date -> completed_at');
              
              // Создаем новую таблицу с правильной схемой
              db.run(`
                CREATE TABLE IF NOT EXISTS workouts_new (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER NOT NULL,
                  workout_type TEXT NOT NULL,
                  duration_minutes INTEGER,
                  calories_burned INTEGER,
                  intensity_level TEXT,
                  exercises_count INTEGER,
                  notes TEXT,
                  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES users (id)
                )
              `, (createErr) => {
                if (createErr) {
                  console.log('Ошибка создания новой таблицы workouts:', createErr.message);
                } else {
                  // Копируем данные из старой таблицы
                  db.run(`
                    INSERT INTO workouts_new (id, user_id, workout_type, duration_minutes, calories_burned, intensity_level, exercises_count, notes, completed_at, created_at)
                    SELECT id, user_id, workout_type, duration_minutes, calories_burned, intensity_level, exercises_count, notes, workout_date, workout_date FROM workouts
                  `, (copyErr) => {
                    if (copyErr) {
                      console.log('Ошибка копирования данных workouts:', copyErr.message);
                    } else {
                      // Удаляем старую таблицу и переименовываем новую
                      db.run(`DROP TABLE workouts`, (dropErr) => {
                        if (dropErr) {
                          console.log('Ошибка удаления старой таблицы workouts:', dropErr.message);
                        } else {
                          db.run(`ALTER TABLE workouts_new RENAME TO workouts`, (renameErr) => {
                            if (renameErr) {
                              console.log('Ошибка переименования таблицы workouts:', renameErr.message);
                            } else {
                              console.log('✅ Миграция таблицы workouts завершена успешно');
                            }
                          });
                        }
                      });
                    }
                  });
                }
              });
            } else if (hasCompletedAt) {
              console.log('✅ Таблица workouts уже имеет правильную схему');
            }
          }
        });

        // Миграция: добавляем колонку description в user_goals
        db.all(`PRAGMA table_info(user_goals)`, (pragmaErr, columns) => {
          if (!pragmaErr && columns) {
            const hasDescription = columns.some(col => col.name === 'description');
            
            if (!hasDescription) {
              db.run(`ALTER TABLE user_goals ADD COLUMN description TEXT`, (alterErr) => {
                if (alterErr) {
                  console.log('Ошибка добавления колонки description в user_goals:', alterErr.message);
                } else {
                  console.log('✅ Добавлена колонка description в таблицу user_goals');
                }
              });
            } else {
              console.log('✅ Колонка description в user_goals уже существует');
            }
          }
        });

        // Миграция: добавляем новые поля для детальных тренировок
        db.all(`PRAGMA table_info(workouts)`, (pragmaErr, columns) => {
          if (!pragmaErr && columns) {
            const hasWorkoutDetails = columns.some(col => col.name === 'workout_details');
            const hasMoodBefore = columns.some(col => col.name === 'mood_before');
            const hasMoodAfter = columns.some(col => col.name === 'mood_after');
            
            if (!hasWorkoutDetails) {
              db.run(`ALTER TABLE workouts ADD COLUMN workout_details TEXT`, (alterErr) => {
                if (alterErr) {
                  console.log('Ошибка добавления колонки workout_details:', alterErr.message);
                } else {
                  console.log('✅ Добавлена колонка workout_details в таблицу workouts');
                }
              });
            }
            
            if (!hasMoodBefore) {
              db.run(`ALTER TABLE workouts ADD COLUMN mood_before INTEGER`, (alterErr) => {
                if (alterErr) {
                  console.log('Ошибка добавления колонки mood_before:', alterErr.message);
                } else {
                  console.log('✅ Добавлена колонка mood_before в таблицу workouts');
                }
              });
            }
            
            if (!hasMoodAfter) {
              db.run(`ALTER TABLE workouts ADD COLUMN mood_after INTEGER`, (alterErr) => {
                if (alterErr) {
                  console.log('Ошибка добавления колонки mood_after:', alterErr.message);
                } else {
                  console.log('✅ Добавлена колонка mood_after в таблицу workouts');
                }
              });
            }
          }
        });

        // Таблица платежей
        db.run(`
          CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            subscription_id INTEGER,
            yookassa_payment_id TEXT UNIQUE NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'RUB',
            status TEXT NOT NULL, -- 'pending', 'succeeded', 'cancelled'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (subscription_id) REFERENCES subscriptions (id)
          )
        `);

        // Таблица фитнес показателей
        db.run(`
          CREATE TABLE IF NOT EXISTS fitness_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            metric_type TEXT NOT NULL, -- 'weight', 'body_fat', 'muscle_mass', 'workout_duration', 'calories_burned'
            value REAL NOT NULL,
            unit TEXT NOT NULL, -- 'kg', '%', 'minutes', 'kcal'
            notes TEXT,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
          )
        `);

        // Таблица тренировок
        db.run(`
          CREATE TABLE IF NOT EXISTS workouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            workout_type TEXT NOT NULL, -- 'strength', 'cardio', 'flexibility', 'mixed'
            duration_minutes INTEGER,
            calories_burned INTEGER,
            intensity_level TEXT, -- 'low', 'medium', 'high'
            exercises_count INTEGER,
            notes TEXT,
            completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
          )
        `);

        // Таблица целей пользователя
        db.run(`
          CREATE TABLE IF NOT EXISTS user_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            goal_type TEXT, -- 'weight_loss', 'muscle_gain', 'endurance', 'strength'
            description TEXT, -- Текстовое описание цели
            target_value REAL,
            current_value REAL,
            target_date DATE,
            status TEXT DEFAULT 'active', -- 'active', 'achieved', 'paused'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
          )
        `);

        // Таблица спортивных показателей
        db.run(`
          CREATE TABLE IF NOT EXISTS fitness_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            metric_type TEXT NOT NULL, -- 'weight', 'body_fat', 'muscle_mass', 'calories_burned', 'workout_duration'
            value REAL NOT NULL,
            unit TEXT NOT NULL, -- 'kg', '%', 'calories', 'minutes'
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            notes TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
          )
        `);

        // Таблица упражнений в тренировке
        db.run(`
          CREATE TABLE IF NOT EXISTS workout_exercises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workout_id INTEGER NOT NULL,
            exercise_name TEXT NOT NULL,
            sets INTEGER,
            reps INTEGER,
            weight_kg REAL,
            duration_seconds INTEGER,
            calories_burned INTEGER,
            FOREIGN KEY (workout_id) REFERENCES workouts (id)
          )
        `);

        // Таблица достижений
        db.run(`
          CREATE TABLE IF NOT EXISTS achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            achievement_type TEXT NOT NULL, -- 'weight_loss', 'strength_gain', 'workout_streak', 'goal_reached'
            title TEXT NOT NULL,
            description TEXT,
            icon TEXT, -- emoji или название иконки
            achieved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
          )
        `);

        console.log('✅ Таблицы базы данных созданы');
        resolve();
      });
    });
  });
}

// Создание или обновление пользователя
export async function createOrUpdateUser(telegramUser) {
  return new Promise((resolve, reject) => {
    const { id, username, first_name } = telegramUser;
    
    // Сначала пытаемся создать пользователя
    db.run(
      `INSERT OR IGNORE INTO users (telegram_id, username, first_name, created_at, last_activity) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, username, first_name],
      function(insertErr) {
        if (insertErr) {
          reject(insertErr);
          return;
        }
        
        // Затем обновляем информацию (если пользователь уже существовал)
        db.run(
          `UPDATE users 
           SET username = ?, first_name = ?, last_activity = CURRENT_TIMESTAMP 
           WHERE telegram_id = ?`,
          [username, first_name, id],
          function(updateErr) {
            if (updateErr) {
              reject(updateErr);
              return;
            }
            
            // Получаем ID пользователя
            db.get(
              `SELECT id FROM users WHERE telegram_id = ?`,
              [id],
              (selectErr, row) => {
                if (selectErr) {
                  reject(selectErr);
                  return;
                }
                resolve(row ? row.id : this.lastID);
              }
            );
          }
        );
      }
    );
  });
}

// Получение пользователя по Telegram ID
export async function getUserByTelegramId(telegramId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM users WHERE telegram_id = ?',
      [telegramId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      }
    );
  });
}

// Обновление статуса согласия с пользовательским соглашением
export async function updateUserAgreement(telegramId, accepted = true) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET agreement_accepted = ? WHERE telegram_id = ?',
      [accepted ? 1 : 0, telegramId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes > 0);
      }
    );
  });
}

// Получение активной подписки пользователя
export async function getActiveSubscription(userId) {
  return new Promise((resolve, reject) => {
    // userId может быть как внутренним ID, так и telegramId
    // Проверяем по обоим полям для совместимости
    
    // Сначала посмотрим все подписки пользователя для отладки
    db.all(
      `SELECT s.* FROM subscriptions s 
       JOIN users u ON s.user_id = u.id 
       WHERE u.id = ? OR u.telegram_id = ?`,
      [userId, userId],
      (err, rows) => {
        if (err) {
          console.error('Error getting all subscriptions:', err);
        } else {
          console.log(`All subscriptions for user ${userId}:`, rows);
        }
      }
    );
    
    db.get(
      `SELECT s.* FROM subscriptions s 
       JOIN users u ON s.user_id = u.id 
       WHERE (u.id = ? OR u.telegram_id = ?) 
       AND s.status = 'active' 
       AND datetime(s.end_date) > datetime('now')
       ORDER BY s.end_date DESC LIMIT 1`,
      [userId, userId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        console.log(`Active subscription query result for user ${userId}:`, row);
        resolve(row);
      }
    );
  });
}

// Создание новой подписки
export async function createSubscription(telegramId, planType, amount, paymentId) {
  return new Promise(async (resolve, reject) => {
    try {
      // Сначала получаем внутренний ID пользователя
      let user = await getUserByTelegramId(telegramId);
      // Если пользователь не найден, создаем его
      if (!user) {
        console.log(`Пользователь ${telegramId} не найден, создаем нового`);
        await createOrUpdateUser({ id: telegramId, username: null, first_name: 'User' });
        user = await getUserByTelegramId(telegramId);
        if (!user) {
          reject(new Error('Не удалось создать пользователя'));
          return;
        }
      }

      const userId = user.id;
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // +1 месяц

      // Определяем лимит запросов на основе плана
      const requestsLimits = { basic: 100, standard: 300, premium: 600 };
      const requestsLimit = requestsLimits[planType] || 100;

      // Генерируем токен
      const accessToken = generateAccessToken(userId, paymentId);

      // Деактивируем старые подписки
      db.run(
        `UPDATE subscriptions 
         SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = ? AND status = 'active'`,
        [userId],
        (err) => {
          if (err) {
            console.error('Error deactivating old subscriptions:', err);
          }

          // Создаем новую подписку со статусом pending
          db.run(
            `INSERT INTO subscriptions 
             (user_id, plan_type, status, start_date, end_date, payment_id, amount, requests_limit, requests_used, access_token, created_at, updated_at)
             VALUES (?, ?, 'pending', CURRENT_TIMESTAMP, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [userId, planType, endDate.toISOString(), paymentId, amount, requestsLimit, accessToken],
            function(err) {
              if (err) {
                reject(err);
                return;
              }
              console.log(`✅ Subscription created with ID: ${this.lastID}, status: pending`);
              resolve(this.lastID);
            }
          );
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

// Активация подписки после успешной оплаты
export async function activateSubscription(paymentId, planType = null) {
  return new Promise((resolve, reject) => {
    // Находим подписку по payment_id
    db.get(
      `SELECT s.*, u.telegram_id 
       FROM subscriptions s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.payment_id = ?`,
      [paymentId],
      (err, subscription) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!subscription) {
          reject(new Error(`Подписка с payment_id ${paymentId} не найдена`));
          return;
        }
        
        // Активируем подписку
        const endDate = new Date();
        if (subscription.plan_type === 'yearly') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }
        
        const accessToken = generateAccessToken(subscription.user_id, paymentId);
        
        db.run(
          `UPDATE subscriptions 
           SET status = 'active', 
               start_date = CURRENT_TIMESTAMP,
               end_date = ?,
               access_token = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [endDate.toISOString(), accessToken, subscription.id],
          function(updateErr) {
            if (updateErr) {
              console.error(`❌ Ошибка активации подписки ${subscription.id}:`, updateErr);
              reject(updateErr);
              return;
            }
            console.log(`✅ Подписка ${subscription.id} активирована для пользователя ${subscription.telegram_id}`);
            console.log(`📅 Действует до: ${endDate.toISOString()}`);
            resolve({ 
              success: true, 
              subscriptionId: subscription.id,
              userId: subscription.user_id,
              telegramId: subscription.telegram_id,
              endDate: endDate.toISOString()
            });
          }
        );
      }
    );
  });
}

// Создание записи о платеже
export async function createPayment(userId, subscriptionId, yookassaPaymentId, amount, status = 'pending') {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO payments (user_id, subscription_id, yookassa_payment_id, amount, status)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, subscriptionId, yookassaPaymentId, amount, status],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.lastID);
      }
    );
  });
}

// Обновление статуса платежа
export async function updatePaymentStatus(yookassaPaymentId, status) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE payments 
       SET status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE yookassa_payment_id = ?`,
      [status, yookassaPaymentId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes > 0);
      }
    );
  });
}

// Получить историю платежей пользователя
export async function getUserPayments(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT p.*, s.plan_type 
       FROM payments p
       LEFT JOIN subscriptions s ON p.subscription_id = s.id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`,
      [userId],
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows || []);
      }
    );
  });
}

// Проверка истёкших подписок
export async function checkExpiredSubscriptions() {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE subscriptions 
       SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
       WHERE status = 'active' AND end_date < CURRENT_TIMESTAMP`,
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        console.log(`Обновлено ${this.changes} истёкших подписок`);
        resolve(this.changes);
      }
    );
  });
}

// Получение статистики
export async function getStats() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions,
        (SELECT COUNT(*) FROM payments WHERE status = 'succeeded') as successful_payments,
        (SELECT SUM(amount) FROM payments WHERE status = 'succeeded') as total_revenue
      `,
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows[0]);
      }
    );
  });
}

// Получение токена доступа пользователя
export async function getUserAccessToken(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT access_token FROM subscriptions 
       WHERE user_id = ? AND status = 'active' AND end_date > CURRENT_TIMESTAMP
       ORDER BY end_date DESC LIMIT 1`,
      [userId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row ? row.access_token : null);
      }
    );
  });
}

// Проверка валидности токена доступа
export async function validateAccessToken(token) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT s.*, u.telegram_id FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       WHERE s.access_token = ? AND s.status = 'active' AND s.end_date > CURRENT_TIMESTAMP`,
      [token],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      }
    );
  });
}

// Обновление времени последнего использования токена
export async function updateTokenUsage(token) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE subscriptions 
       SET updated_at = CURRENT_TIMESTAMP 
       WHERE access_token = ?`,
      [token],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes > 0);
      }
    );
  });
}

// Получение всех подписок пользователя для отладки
export async function getAllUserSubscriptions(userIdOrTelegramId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT s.* FROM subscriptions s 
       JOIN users u ON s.user_id = u.id 
       WHERE u.telegram_id = ? OR u.id = ?
       ORDER BY s.created_at DESC`,
      [userIdOrTelegramId, userIdOrTelegramId],
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      }
    );
  });
}

// ============================================
// ФУНКЦИИ ДЛЯ АНАЛИТИКИ И МЕТРИК
// ============================================

// Добавление фитнес показателя
export async function addFitnessMetric(userId, metricType, value, unit, notes = null, recordedAt = null) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO fitness_metrics (user_id, metric_type, value, unit, notes, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [userId, metricType, value, unit, notes, recordedAt || new Date().toISOString()], function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this.lastID);
    });
  });
}

// Получение показателей пользователя
export async function getUserMetrics(userId, metricType = null, limit = 50) {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT * FROM fitness_metrics
      WHERE user_id = ?
    `;
    const params = [userId];
    
    if (metricType) {
      query += ` AND metric_type = ?`;
      params.push(metricType);
    }
    
    query += ` ORDER BY recorded_at DESC LIMIT ?`;
    params.push(limit);
    
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

// Добавление тренировки
export async function addWorkout(userId, workoutType, duration, caloriesBurned, intensity, exercisesCount, notes = null) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO workouts (user_id, workout_type, duration_minutes, calories_burned, intensity_level, exercises_count, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [userId, workoutType, duration, caloriesBurned, intensity, exercisesCount, notes], function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this.lastID);
    });
  });
}

// Получение тренировок пользователя
export async function getUserWorkouts(userId, limit = 30) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM workouts
      WHERE user_id = ?
      ORDER BY completed_at DESC
      LIMIT ?
    `;
    
    db.all(query, [userId, limit], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

// Получение статистики за период
export async function getUserStats(userId, days = 30) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        COUNT(w.id) as total_workouts,
        AVG(w.duration_minutes) as avg_duration,
        SUM(w.calories_burned) as total_calories,
        AVG(w.calories_burned) as avg_calories,
        (SELECT value FROM fitness_metrics fm WHERE fm.user_id = ? AND fm.metric_type = 'weight' ORDER BY recorded_at DESC LIMIT 1) as current_weight,
        (SELECT value FROM fitness_metrics fm WHERE fm.user_id = ? AND fm.metric_type = 'body_fat' ORDER BY recorded_at DESC LIMIT 1) as current_body_fat
      FROM workouts w
      WHERE w.user_id = ? AND w.completed_at >= date('now', '-' || ? || ' days')
    `;
    
    db.get(query, [userId, userId, userId, days], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row || {});
    });
  });
}

// Добавление/обновление цели
export async function setUserGoal(userId, description, goalType = null, targetValue = null, targetDate = null) {
  return new Promise((resolve, reject) => {
    // Деактивируем старые цели с таким же описанием
    db.run(
      `UPDATE user_goals SET status = 'replaced' WHERE user_id = ? AND status = 'active'`,
      [userId],
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Добавляем новую цель
        const query = `
          INSERT INTO user_goals (user_id, description, goal_type, target_value, target_date)
          VALUES (?, ?, ?, ?, ?)
        `;
        
        db.run(query, [userId, description, goalType, targetValue, targetDate], function(insertErr) {
          if (insertErr) {
            reject(insertErr);
            return;
          }
          resolve(this.lastID);
        });
      }
    );
  });
}

// Получение активных целей пользователя
export async function getUserGoals(userId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM user_goals
      WHERE user_id = ? AND status = 'active'
      ORDER BY created_at DESC
    `;
    
    db.all(query, [userId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

// ===== АНАЛИТИЧЕСКИЕ ФУНКЦИИ =====

// Сохранение показателя
export async function saveFitnessMetric(userId, metricType, value, unit, notes = null) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO fitness_metrics (user_id, metric_type, value, unit, notes)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(query, [userId, metricType, value, unit, notes], function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this.lastID);
    });
  });
}

// Сохранение тренировки
export async function saveWorkout(userId, workoutType, duration, calories = 0, exercisesCount = 0, intensity = 3, notes = null) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO workouts (user_id, workout_type, duration_minutes, calories_burned, exercises_count, intensity_level, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [userId, workoutType, duration, calories, exercisesCount, intensity, notes], function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this.lastID);
    });
  });
}

// Получение истории показателей
export async function getFitnessMetricHistory(userId, metricType, days = 30) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT value, unit, recorded_at, notes
      FROM fitness_metrics
      WHERE user_id = ? AND metric_type = ? AND recorded_at >= date('now', '-' || ? || ' days')
      ORDER BY recorded_at ASC
    `;
    
    db.all(query, [userId, metricType, days], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

// Получение статистики тренировок
export async function getWorkoutStats(userId, days = 30) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        COUNT(*) as total_workouts,
        AVG(duration_minutes) as avg_duration,
        SUM(calories_burned) as total_calories,
        AVG(intensity_level) as avg_intensity,
        workout_type,
        COUNT(*) as type_count
      FROM workouts
      WHERE user_id = ? AND completed_at >= date('now', '-' || ? || ' days')
      GROUP BY workout_type
      ORDER BY type_count DESC
    `;
    
    db.all(query, [userId, days], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

// Получение достижений
export async function getUserAchievements(userId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT title, description, icon, achieved_at
      FROM achievements
      WHERE user_id = ?
      ORDER BY achieved_at DESC
    `;
    
    db.all(query, [userId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

// Добавление достижения
export async function addAchievement(userId, type, title, description, icon = '🏆') {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO achievements (user_id, achievement_type, title, description, icon)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(query, [userId, type, title, description, icon], function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this.lastID);
    });
  });
}

// Увеличение счетчика использованных запросов
export async function incrementRequestUsage(userId) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE subscriptions 
       SET requests_used = requests_used + 1 
       WHERE user_id = ? AND status = 'active' AND end_date > datetime('now')`,
      [userId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes > 0);
      }
    );
  });
}

// Проверка, может ли пользователь делать запросы
export async function canMakeRequest(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT requests_limit, requests_used 
       FROM subscriptions 
       WHERE user_id = ? AND status = 'active' AND end_date > datetime('now')`,
      [userId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          resolve({ canMake: false, reason: 'no_subscription' });
          return;
        }
        
        const remaining = row.requests_limit - row.requests_used;
        resolve({
          canMake: remaining > 0,
          remaining: remaining,
          total: row.requests_limit,
          used: row.requests_used,
          reason: remaining > 0 ? null : 'limit_exceeded'
        });
      }
    );
  });
}

// Получение информации о бесплатных запросах пользователя
export async function getUserFreeRequests(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT free_requests_limit, free_requests_used 
       FROM users 
       WHERE id = ?`,
      [userId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          resolve({ remaining: 0, limit: 7, used: 0 });
          return;
        }
        
        const limit = row.free_requests_limit || 7;
        const used = row.free_requests_used || 0;
        const remaining = Math.max(0, limit - used);
        
        resolve({
          remaining: remaining,
          limit: limit,
          used: used
        });
      }
    );
  });
}

// Использование бесплатного запроса
export async function useFreeRequest(userId) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE users 
       SET free_requests_used = COALESCE(free_requests_used, 0) + 1 
       WHERE id = ? AND COALESCE(free_requests_used, 0) < COALESCE(free_requests_limit, 7)`,
      [userId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes > 0);
      }
    );
  });
}

// Проверка, может ли пользователь делать запросы (подписка или бесплатные)
export async function canUserMakeRequest(userId) {
  return new Promise(async (resolve, reject) => {
    try {
      // Проверяем активную подписку
      const subscription = await getActiveSubscription(userId);
      
      if (subscription) {
        const remaining = subscription.requests_limit - subscription.requests_used;
        if (remaining > 0) {
          resolve({
            canMake: true,
            type: 'subscription',
            remaining: remaining,
            total: subscription.requests_limit,
            used: subscription.requests_used
          });
          return;
        }
      }
      
      // Проверяем бесплатные запросы
      const freeRequests = await getUserFreeRequests(userId);
      if (freeRequests.remaining > 0) {
        resolve({
          canMake: true,
          type: 'free',
          remaining: freeRequests.remaining,
          total: freeRequests.total,
          used: freeRequests.used
        });
        return;
      }
      
      resolve({
        canMake: false,
        reason: 'no_requests_left',
        type: 'none'
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// Функции для управления пользовательскими данными

// Получить последнюю запись веса
export async function getLastWeightRecord(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM fitness_metrics 
       WHERE user_id = ? AND metric_type = 'weight' 
       ORDER BY recorded_at DESC LIMIT 1`,
      [userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

// Обновить последнюю запись веса
export async function updateLastWeightRecord(userId, newValue, newUnit = 'kg') {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE fitness_metrics 
       SET value = ?, unit = ?, recorded_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND metric_type = 'weight' 
       AND id = (SELECT id FROM fitness_metrics 
                 WHERE user_id = ? AND metric_type = 'weight' 
                 ORDER BY recorded_at DESC LIMIT 1)`,
      [newValue, newUnit, userId, userId],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

// Удалить последнюю запись веса
export async function deleteLastWeightRecord(userId) {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM fitness_metrics 
       WHERE user_id = ? AND metric_type = 'weight' 
       AND id = (SELECT id FROM fitness_metrics 
                 WHERE user_id = ? AND metric_type = 'weight' 
                 ORDER BY recorded_at DESC LIMIT 1)`,
      [userId, userId],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

// Получить последнюю тренировку
export async function getLastWorkoutRecord(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM workouts 
       WHERE user_id = ? 
       ORDER BY workout_date DESC LIMIT 1`,
      [userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

// Обновить последнюю тренировку
export async function updateLastWorkoutRecord(userId, workoutType, duration, caloriesBurned, intensity, exercisesCount, notes = null) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE workouts 
       SET workout_type = ?, duration_minutes = ?, calories_burned = ?, 
           intensity = ?, exercises_count = ?, notes = ?, workout_date = CURRENT_TIMESTAMP
       WHERE user_id = ? 
       AND id = (SELECT id FROM workouts 
                 WHERE user_id = ? 
                 ORDER BY workout_date DESC LIMIT 1)`,
      [workoutType, duration, caloriesBurned, intensity, exercisesCount, notes, userId, userId],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

// Удалить последнюю тренировку
export async function deleteLastWorkoutRecord(userId) {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM workouts 
       WHERE user_id = ? 
       AND id = (SELECT id FROM workouts 
                 WHERE user_id = ? 
                 ORDER BY workout_date DESC LIMIT 1)`,
      [userId, userId],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

// Удалить цель
export async function deleteUserGoal(userId, goalType) {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM user_goals 
       WHERE user_id = ? AND goal_type = ?`,
      [userId, goalType],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

// Обновить цель
export async function updateUserGoal(userId, goalType, targetValue, targetDate = null) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE user_goals 
       SET target_value = ?, target_date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND goal_type = ?`,
      [targetValue, targetDate, userId, goalType],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

// Очистить все данные пользователя (кроме подписок)
export async function clearAllUserData(userId) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`DELETE FROM fitness_metrics WHERE user_id = ?`, [userId]);
      db.run(`DELETE FROM workouts WHERE user_id = ?`, [userId]);
      db.run(`DELETE FROM user_goals WHERE user_id = ?`, [userId]);
      db.run(`DELETE FROM achievements WHERE user_id = ?`, [userId], function(err) {
        if (err) reject(err);
        else resolve(true);
      });
    });
  });
}

// Получить статистику пользователя
export async function getUserDataSummary(userId) {
  return new Promise((resolve, reject) => {
    const summary = {};
    
    db.serialize(() => {
      // Количество записей веса
      db.get(
        `SELECT COUNT(*) as count FROM fitness_metrics WHERE user_id = ? AND metric_type = 'weight'`,
        [userId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          summary.weightRecords = row.count;
        }
      );
      
      // Количество тренировок
      db.get(
        `SELECT COUNT(*) as count FROM workouts WHERE user_id = ?`,
        [userId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          summary.workoutRecords = row.count;
        }
      );
      
      // Количество целей
      db.get(
        `SELECT COUNT(*) as count FROM user_goals WHERE user_id = ?`,
        [userId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          summary.goalRecords = row.count;
          resolve(summary);
        }
      );
    });
  });
}

// Функции для детальных тренировок

// Сохранить детальную тренировку
export async function saveDetailedWorkout(userId, workoutType, duration, workoutDetails, moodBefore = null, moodAfter = null, notes = null) {
  return new Promise((resolve, reject) => {
    const detailsJson = JSON.stringify(workoutDetails);
    
    db.run(
      `INSERT INTO workouts (user_id, workout_type, duration_minutes, calories_burned, intensity_level, exercises_count, notes, workout_details, mood_before, mood_after, completed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        userId, 
        workoutType, 
        duration, 
        workoutDetails.totalCalories || 0,
        workoutDetails.averageIntensity || 'medium',
        workoutDetails.exercises?.length || 0,
        notes,
        detailsJson,
        moodBefore,
        moodAfter
      ],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// Получить детальную тренировку
export async function getDetailedWorkout(workoutId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT *, workout_details as details FROM workouts WHERE id = ?`,
      [workoutId],
      (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          // Парсим JSON детали
          if (row.details) {
            try {
              row.parsedDetails = JSON.parse(row.details);
            } catch (parseErr) {
              row.parsedDetails = null;
            }
          }
          resolve(row);
        } else {
          resolve(null);
        }
      }
    );
  });
}

// Получить детальные тренировки пользователя
export async function getUserDetailedWorkouts(userId, limit = 10) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT *, workout_details as details FROM workouts 
       WHERE user_id = ? AND workout_details IS NOT NULL AND workout_details != ''
       ORDER BY completed_at DESC 
       LIMIT ?`,
      [userId, limit],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Парсим JSON детали для каждой тренировки
          const workouts = rows.map(row => {
            if (row.details) {
              try {
                row.workout_details = JSON.parse(row.details);
              } catch (parseErr) {
                row.workout_details = null;
              }
            }
            return row;
          });
          resolve(workouts);
        }
      }
    );
  });
}

// Обновить детальную тренировку
export async function updateDetailedWorkout(workoutId, workoutType, duration, workoutDetails, moodBefore = null, moodAfter = null, notes = null) {
  return new Promise((resolve, reject) => {
    const detailsJson = JSON.stringify(workoutDetails);
    
    db.run(
      `UPDATE workouts 
       SET workout_type = ?, duration_minutes = ?, calories_burned = ?, 
           intensity_level = ?, exercises_count = ?, notes = ?, 
           workout_details = ?, mood_before = ?, mood_after = ?
       WHERE id = ?`,
      [
        workoutType,
        duration,
        workoutDetails.totalCalories || 0,
        workoutDetails.averageIntensity || 'medium',
        workoutDetails.exercises?.length || 0,
        notes,
        detailsJson,
        moodBefore,
        moodAfter,
        workoutId
      ],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

// Получить статистику прогресса по упражнениям
export async function getExerciseProgressStats(userId, exerciseName, limit = 10) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT completed_at, workout_details 
       FROM workouts 
       WHERE user_id = ? AND workout_details LIKE ?
       ORDER BY completed_at DESC 
       LIMIT ?`,
      [userId, `%"${exerciseName}"%`, limit],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const progressData = [];
          
          rows.forEach(row => {
            if (row.workout_details) {
              try {
                const details = JSON.parse(row.workout_details);
                if (details.exercises) {
                  const exercise = details.exercises.find(ex => ex.name === exerciseName);
                  if (exercise) {
                    progressData.push({
                      date: row.completed_at,
                      exercise: exercise
                    });
                  }
                }
              } catch (parseErr) {
                // Игнорируем ошибки парсинга
              }
            }
          });
          
          resolve(progressData);
        }
      }
    );
  });
}

// === ФУНКЦИИ УДАЛЕНИЯ ЗАПИСЕЙ ===

// Удалить последнюю тренировку
export async function deleteLastWorkout(userId) {
  return new Promise((resolve, reject) => {
    // Сначала находим последнюю тренировку
    db.get(
      'SELECT id, completed_at FROM workouts WHERE user_id = ? ORDER BY completed_at DESC LIMIT 1',
      [userId],
      (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve({ success: false, message: 'Тренировки не найдены' });
        } else {
          // Удаляем найденную тренировку
          db.run(
            'DELETE FROM workouts WHERE id = ?',
            [row.id],
            function(deleteErr) {
              if (deleteErr) {
                reject(deleteErr);
              } else {
                resolve({ 
                  success: true, 
                  message: 'Последняя тренировка удалена',
                  deletedAt: row.completed_at
                });
              }
            }
          );
        }
      }
    );
  });
}

// Удалить последнюю запись веса
export async function deleteLastWeight(userId) {
  return new Promise((resolve, reject) => {
    // Сначала находим последнюю запись веса
    db.get(
      'SELECT id, recorded_at, value FROM fitness_metrics WHERE user_id = ? AND metric_type = "weight" ORDER BY recorded_at DESC LIMIT 1',
      [userId],
      (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve({ success: false, message: 'Записи веса не найдены' });
        } else {
          // Удаляем найденную запись веса
          db.run(
            'DELETE FROM fitness_metrics WHERE id = ?',
            [row.id],
            function(deleteErr) {
              if (deleteErr) {
                reject(deleteErr);
              } else {
                resolve({ 
                  success: true, 
                  message: 'Последняя запись веса удалена',
                  deletedAt: row.recorded_at,
                  value: row.value
                });
              }
            }
          );
        }
      }
    );
  });
}

// Удалить все тренировки пользователя
export async function deleteAllWorkouts(userId) {
  return new Promise((resolve, reject) => {
    // Сначала подсчитываем количество тренировок
    db.get(
      'SELECT COUNT(*) as count FROM workouts WHERE user_id = ?',
      [userId],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          const count = row.count;
          if (count === 0) {
            resolve({ success: false, message: 'Тренировки не найдены' });
          } else {
            // Удаляем все тренировки
            db.run(
              'DELETE FROM workouts WHERE user_id = ?',
              [userId],
              function(deleteErr) {
                if (deleteErr) {
                  reject(deleteErr);
                } else {
                  resolve({ 
                    success: true, 
                    message: `Удалено ${count} тренировок`,
                    count: count
                  });
                }
              }
            );
          }
        }
      }
    );
  });
}

// Удалить все записи веса пользователя
export async function deleteAllWeights(userId) {
  return new Promise((resolve, reject) => {
    // Сначала подсчитываем количество записей веса
    db.get(
      'SELECT COUNT(*) as count FROM fitness_metrics WHERE user_id = ? AND metric_type = "weight"',
      [userId],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          const count = row.count;
          if (count === 0) {
            resolve({ success: false, message: 'Записи веса не найдены' });
          } else {
            // Удаляем все записи веса
            db.run(
              'DELETE FROM fitness_metrics WHERE user_id = ? AND metric_type = "weight"',
              [userId],
              function(deleteErr) {
                if (deleteErr) {
                  reject(deleteErr);
                } else {
                  resolve({ 
                    success: true, 
                    message: `Удалено ${count} записей веса`,
                    count: count
                  });
                }
              }
            );
          }
        }
      }
    );
  });
}

// Удалить все цели пользователя
export async function deleteAllGoals(userId) {
  return new Promise((resolve, reject) => {
    // Сначала подсчитываем количество целей
    db.get(
      'SELECT COUNT(*) as count FROM user_goals WHERE user_id = ?',
      [userId],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          const count = row.count;
          if (count === 0) {
            resolve({ success: false, message: 'Цели не найдены' });
          } else {
            // Удаляем все цели
            db.run(
              'DELETE FROM user_goals WHERE user_id = ?',
              [userId],
              function(deleteErr) {
                if (deleteErr) {
                  reject(deleteErr);
                } else {
                  resolve({ 
                    success: true, 
                    message: `Удалено ${count} целей`,
                    count: count
                  });
                }
              }
            );
          }
        }
      }
    );
  });
}

// Обновление подписки пользователя после оплаты
export async function updateUserSubscription(telegramId, subscriptionData) {
  return new Promise((resolve, reject) => {
    console.log(`📝 Updating subscription for user ${telegramId}:`, subscriptionData);
    
    // Сначала получаем или создаем пользователя
    db.get(
      'SELECT id FROM users WHERE telegram_id = ?',
      [telegramId],
      (err, user) => {
        if (err) {
          console.error('❌ Error finding user:', err);
          reject(err);
          return;
        }

        if (!user) {
          console.log('👤 User not found, creating new user');
          // Создаем пользователя если не существует
          db.run(
            `INSERT INTO users (telegram_id, created_at, last_activity) 
             VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [telegramId],
            function(insertErr) {
              if (insertErr) {
                console.error('❌ Error creating user:', insertErr);
                reject(insertErr);
                return;
              }
              
              const userId = this.lastID;
              updateSubscription(userId, subscriptionData, resolve, reject);
            }
          );
        } else {
          updateSubscription(user.id, subscriptionData, resolve, reject);
        }
      }
    );
  });

  function updateSubscription(userId, data, resolve, reject) {
    console.log(`💳 Updating subscription for user ID ${userId}`, data);
    
    // Сначала проверим существующие активные подписки
    db.run(
      `UPDATE subscriptions 
       SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = ? AND status = 'active'`,
      [userId],
      (updateErr) => {
        if (updateErr) {
          console.error('❌ Error deactivating old subscriptions:', updateErr);
          reject(updateErr);
          return;
        }

        console.log('✅ Deactivated old subscriptions for user', userId);

        // Теперь создаем новую активную подписку
        const startDate = new Date().toISOString();
        
        db.run(
          `INSERT INTO subscriptions 
           (user_id, plan_type, status, start_date, end_date, payment_id, amount, requests_limit, requests_used, created_at, updated_at) 
           VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            userId, 
            data.subscription_type,
            startDate,
            data.subscription_end,
            data.payment_id,
            data.amount || null,
            data.requests_limit,
            data.requests_used || 0
          ],
          function(err) {
            if (err) {
              console.error('❌ Error creating new subscription:', err);
              reject(err);
              return;
            }

            console.log('✅ New subscription created successfully:', {
              subscription_id: this.lastID,
              user_id: userId,
              plan_type: data.subscription_type,
              end_date: data.subscription_end
            });
            
            resolve({
              success: true,
              subscription_id: this.lastID,
              user_id: userId
            });
          }
        );
      }
    );
  }
}

export { db };
