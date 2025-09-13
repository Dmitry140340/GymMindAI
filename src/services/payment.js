console.log('Starting payment module with init function...');

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

console.log('All imports loaded');

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';

function initializePaymentMode() {
  console.log('initializePaymentMode called');
  const mode = process.env.PAYMENT_MODE || 'test';
  let shopId, secretKey;
  
  if (mode === 'production') {
    shopId = process.env.YOOKASSA_PROD_SHOP_ID || '1048732';
    secretKey = process.env.YOOKASSA_PROD_SECRET_KEY || 'live_E2dE-ecYsexDzsBT-AzkDNeZ2HWPCBGQ52yPO6LdnIs';
    console.log('💳 Платежи: ПРОДАКШН режим (реальные платежи)');
  } else {
    shopId = process.env.YOOKASSA_TEST_SHOP_ID || '1139867';
    secretKey = process.env.YOOKASSA_TEST_SECRET_KEY || 'test_hczBNmYmZ4vs8QaSMsyGHFdtU_3X039YoTcFS4L7DMo';
    console.log('🧪 Платежи: ТЕСТОВЫЙ режим (без реальных денег)');
  }
  
  process.env.YOOKASSA_SHOP_ID = shopId;
  process.env.YOOKASSA_SECRET_KEY = secretKey;
  console.log(`🏪 Shop ID: ${shopId}`);
}

export async function handlePaymentWebhook(data, bot) {
  console.log('handlePaymentWebhook called');
}

export async function createSubscriptionPayment(telegramId, planType) {
  console.log('createSubscriptionPayment called');
  return { success: false, error: 'With init function version' };
}

console.log('About to call initializePaymentMode...');
initializePaymentMode();
console.log('Payment module with init function loaded');
