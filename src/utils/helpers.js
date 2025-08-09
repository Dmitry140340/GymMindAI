// Форматирование даты
export function formatDate(date) {
  return new Date(date).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Форматирование цены
export function formatPrice(amount) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount);
}

// Проверка валидности Telegram ID
export function isValidTelegramId(id) {
  return Number.isInteger(id) && id > 0;
}

// Генерация случайной строки
export function generateRandomString(length = 8) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Задержка выполнения
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Валидация email
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Получение информации о плане подписки
export function getSubscriptionPlanInfo(planType) {
  const plans = {
    monthly: {
      name: 'Месячная подписка',
      duration: '1 месяц',
      price: parseFloat(process.env.MONTHLY_PRICE || '999'),
      savings: 0
    },
    yearly: {
      name: 'Годовая подписка', 
      duration: '1 год',
      price: parseFloat(process.env.YEARLY_PRICE || '9990'),
      savings: (parseFloat(process.env.MONTHLY_PRICE || '999') * 12) - parseFloat(process.env.YEARLY_PRICE || '9990')
    }
  };
  
  return plans[planType] || null;
}

// Проверка истечения подписки
export function isSubscriptionExpired(endDate) {
  return new Date(endDate) < new Date();
}

// Расчет дней до истечения подписки
export function getDaysUntilExpiry(endDate) {
  const now = new Date();
  const expiry = new Date(endDate);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Логирование с метками времени
export function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
}

// Безопасная обработка ошибок для пользователя
export function getUserFriendlyError(error) {
  if (error.message.includes('network') || error.message.includes('timeout')) {
    return 'Проблемы с сетью. Попробуйте ещё раз через несколько секунд.';
  }
  
  if (error.message.includes('authorization') || error.message.includes('401')) {
    return 'Ошибка авторизации. Обратитесь к администратору.';
  }
  
  if (error.message.includes('rate limit') || error.message.includes('429')) {
    return 'Слишком много запросов. Попробуйте через минуту.';
  }
  
  return 'Произошла техническая ошибка. Попробуйте ещё раз.';
}

// Эскейпинг HTML для Telegram
export function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Ограничение длины текста
export function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
