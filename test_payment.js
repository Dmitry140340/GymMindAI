// Тест платежной системы YooKassa
import dotenv from 'dotenv';
import { createSubscriptionPayment } from './src/services/payment.js';

dotenv.config();

console.log('🧪 Тестирование платежной системы YooKassa...');

try {
  console.log('🔧 Проверка настроек платежной системы...');
  console.log('💳 PAYMENT_MODE:', process.env.PAYMENT_MODE);
  console.log('🏪 Shop ID доступен:', !!process.env.YOOKASSA_PROD_SHOP_ID);
  console.log('🔑 Secret Key доступен:', !!process.env.YOOKASSA_PROD_SECRET_KEY);
  
  // Тестовые данные
  const testUser = {
    telegram_id: 777777777,
    username: 'payment_test',
    first_name: 'Payment',
    last_name: 'Test'
  };
  
  const testPlan = 'basic';
  const testAmount = parseInt(process.env.BASIC_PRICE);
  
  console.log('💰 Создание тестового платежа...');
  console.log(`📊 План: ${testPlan}`);
  console.log(`💵 Сумма: ${testAmount}₽`);
  
  const paymentResult = await createSubscriptionPayment(testUser, testPlan, testAmount);
  
  if (paymentResult && paymentResult.success) {
    console.log('✅ Платеж успешно создан');
    console.log('🆔 Payment ID:', paymentResult.payment?.id);
    console.log('🔗 Ссылка для оплаты:', paymentResult.payment?.confirmation?.confirmation_url);
    console.log('📊 Статус:', paymentResult.payment?.status);
    console.log('💰 Сумма:', paymentResult.payment?.amount?.value + ' ' + paymentResult.payment?.amount?.currency);
  } else {
    console.log('❌ Ошибка создания платежа');
    console.log('📄 Детали:', paymentResult?.error || paymentResult?.message);
  }
  
  console.log('\n🎉 Тест платежной системы завершен!');

} catch (error) {
  console.error('❌ Ошибка при тестировании платежной системы:', error.message);
}
