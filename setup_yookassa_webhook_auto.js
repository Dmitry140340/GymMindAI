#!/usr/bin/env node

/**
 * Скрипт для настройки вебхука YooKassa
 * Настраивает уведомления о платежах на ваш сервер
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';

async function setupWebhook() {
  console.log('🔧 НАСТРОЙКА ВЕБХУКА YOOKASSA\n');
  console.log('='.repeat(60));
  
  // Определяем режим работы
  const mode = process.env.PAYMENT_MODE || 'test';
  const shopId = mode === 'production' 
    ? process.env.YOOKASSA_PROD_SHOP_ID 
    : process.env.YOOKASSA_TEST_SHOP_ID;
  const secretKey = mode === 'production'
    ? process.env.YOOKASSA_PROD_SECRET_KEY
    : process.env.YOOKASSA_TEST_SECRET_KEY;
  
  const webhookUrl = process.env.YOOKASSA_WEBHOOK_URL;
  
  console.log(`\n📋 Параметры:`);
  console.log(`   Режим: ${mode === 'production' ? '🔴 ПРОДАКШН' : '🧪 ТЕСТ'}`);
  console.log(`   Shop ID: ${shopId}`);
  console.log(`   Webhook URL: ${webhookUrl}`);
  
  if (!shopId || !secretKey || !webhookUrl) {
    console.error('\n❌ ОШИБКА: Отсутствуют необходимые переменные окружения!');
    console.error('   Проверьте .env файл:');
    console.error('   - PAYMENT_MODE');
    console.error('   - YOOKASSA_TEST_SHOP_ID / YOOKASSA_PROD_SHOP_ID');
    console.error('   - YOOKASSA_TEST_SECRET_KEY / YOOKASSA_PROD_SECRET_KEY');
    console.error('   - YOOKASSA_WEBHOOK_URL');
    process.exit(1);
  }
  
  try {
    console.log('\n🔍 Получаем список существующих вебхуков...');
    
    const authHeader = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
    
    // Получаем список вебхуков
    const listResponse = await axios.get(
      `${YOOKASSA_API_URL}/webhooks`,
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const existingWebhooks = listResponse.data.items || [];
    console.log(`   Найдено существующих вебхуков: ${existingWebhooks.length}`);
    
    // Удаляем старые вебхуки
    if (existingWebhooks.length > 0) {
      console.log('\n🗑️  Удаляем старые вебхуки...');
      
      for (const webhook of existingWebhooks) {
        console.log(`   Удаление: ${webhook.id} (${webhook.url})`);
        
        try {
          await axios.delete(
            `${YOOKASSA_API_URL}/webhooks/${webhook.id}`,
            {
              headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log(`   ✅ Удален`);
        } catch (delError) {
          console.error(`   ❌ Ошибка удаления: ${delError.message}`);
        }
      }
    }
    
    // Создаем новый вебхук
    console.log('\n➕ Создаем новый вебхук...');
    
    const webhookData = {
      event: 'payment.succeeded',
      url: webhookUrl
    };
    
    const createResponse = await axios.post(
      `${YOOKASSA_API_URL}/webhooks`,
      webhookData,
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\n✅ ВЕБХУК УСПЕШНО НАСТРОЕН!');
    console.log('='.repeat(60));
    console.log(`\n📋 Детали вебхука:`);
    console.log(`   ID: ${createResponse.data.id}`);
    console.log(`   URL: ${createResponse.data.url}`);
    console.log(`   Событие: ${createResponse.data.event}`);
    
    console.log('\n💡 Что дальше:');
    console.log('   1. Вебхук готов принимать уведомления о платежах');
    console.log('   2. После успешной оплаты YooKassa отправит POST-запрос на ваш сервер');
    console.log('   3. Бот автоматически активирует подписку пользователя');
    
    if (mode === 'test') {
      console.log('\n🧪 ТЕСТОВЫЙ РЕЖИМ:');
      console.log('   - Используйте тестовые карты YooKassa для оплаты');
      console.log('   - Карта: 5555 5555 5555 4444, Срок: любой будущий, CVC: любой');
      console.log('   - Реальные деньги НЕ списываются');
    } else {
      console.log('\n🔴 ПРОДАКШН РЕЖИМ:');
      console.log('   - ⚠️  Будут приниматься РЕАЛЬНЫЕ платежи!');
      console.log('   - Убедитесь, что все настройки корректны');
    }
    
  } catch (error) {
    console.error('\n❌ ОШИБКА настройки вебхука:');
    
    if (error.response) {
      console.error(`   Статус: ${error.response.status}`);
      console.error(`   Данные:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`   ${error.message}`);
    }
    
    console.log('\n💡 Возможные причины:');
    console.log('   - Неверные учетные данные YooKassa');
    console.log('   - Webhook URL недоступен из интернета');
    console.log('   - Проблемы с SSL сертификатом');
    console.log('   - Ограничения IP в настройках YooKassa');
    
    process.exit(1);
  }
}

// Запускаем настройку
setupWebhook().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
});
