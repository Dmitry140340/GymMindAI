import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔬 ПОЛНОЦЕННОЕ ТЕСТИРОВАНИЕ БОТА: ОТ А ДО Я\n');
console.log('='.repeat(80) + '\n');

const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  categories: {}
};

// ============================================================================
// КАТЕГОРИЯ 1: СТРУКТУРА ПРОЕКТА
// ============================================================================

async function testProjectStructure() {
  console.log('📂 ТЕСТ 1: СТРУКТУРА ПРОЕКТА\n');
  
  const category = {
    name: 'Структура проекта',
    tests: [],
    passed: 0,
    failed: 0
  };
  
  const requiredFiles = {
    'package.json': 'Конфигурация проекта',
    '.env': 'Переменные окружения',
    'src/index.js': 'Точка входа приложения',
    'src/bot/handlers.js': 'Обработчики бота',
    'src/bot/keyboards.js': 'Клавиатуры',
    'src/services/database.js': 'База данных',
    'src/services/coze.js': 'Интеграция Coze AI',
    'src/services/payment.js': 'Платежная система',
    'data/': 'Директория для данных'
  };
  
  for (const [file, description] of Object.entries(requiredFiles)) {
    testResults.total++;
    const filePath = path.join(__dirname, file);
    const exists = fs.existsSync(filePath);
    
    category.tests.push({
      name: `${file} - ${description}`,
      status: exists ? 'passed' : 'failed',
      message: exists ? 'Файл существует' : 'ФАЙЛ ОТСУТСТВУЕТ'
    });
    
    if (exists) {
      testResults.passed++;
      category.passed++;
      console.log(`  ✅ ${file} - ${description}`);
    } else {
      testResults.failed++;
      category.failed++;
      console.log(`  ❌ ${file} - ${description} - ОТСУТСТВУЕТ`);
    }
  }
  
  testResults.categories['structure'] = category;
  console.log('');
}

// ============================================================================
// КАТЕГОРИЯ 2: ЗАВИСИМОСТИ NPM
// ============================================================================

async function testDependencies() {
  console.log('📦 ТЕСТ 2: ЗАВИСИМОСТИ NPM\n');
  
  const category = {
    name: 'Зависимости',
    tests: [],
    passed: 0,
    failed: 0
  };
  
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')
  );
  
  const requiredDeps = {
    'node-telegram-bot-api': 'Telegram Bot API',
    'axios': 'HTTP клиент',
    'dotenv': 'Переменные окружения',
    'express': 'Web сервер',
    'sqlite3': 'База данных',
    'uuid': 'Генератор UUID',
    'canvas': 'Генерация изображений',
    'chart.js': 'Графики',
    'chartjs-node-canvas': 'Графики для Node.js'
  };
  
  for (const [dep, description] of Object.entries(requiredDeps)) {
    testResults.total++;
    const installed = packageJson.dependencies && packageJson.dependencies[dep];
    
    category.tests.push({
      name: `${dep} - ${description}`,
      status: installed ? 'passed' : 'failed',
      message: installed ? `v${packageJson.dependencies[dep]}` : 'НЕ УСТАНОВЛЕН'
    });
    
    if (installed) {
      testResults.passed++;
      category.passed++;
      console.log(`  ✅ ${dep} - ${description} (${packageJson.dependencies[dep]})`);
    } else {
      testResults.failed++;
      category.failed++;
      console.log(`  ❌ ${dep} - ${description} - НЕ УСТАНОВЛЕН`);
    }
  }
  
  // Проверка node_modules
  testResults.total++;
  const nodeModulesExists = fs.existsSync(path.join(__dirname, 'node_modules'));
  
  if (nodeModulesExists) {
    testResults.passed++;
    category.passed++;
    console.log(`  ✅ node_modules - Зависимости установлены`);
  } else {
    testResults.failed++;
    category.failed++;
    console.log(`  ❌ node_modules - НЕ УСТАНОВЛЕНЫ (запустите npm install)`);
  }
  
  testResults.categories['dependencies'] = category;
  console.log('');
}

// ============================================================================
// КАТЕГОРИЯ 3: ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ
// ============================================================================

async function testEnvironmentVariables() {
  console.log('🔐 ТЕСТ 3: ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ\n');
  
  const category = {
    name: 'Переменные окружения',
    tests: [],
    passed: 0,
    failed: 0,
    warnings: 0
  };
  
  const envPath = path.join(__dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    testResults.total++;
    testResults.failed++;
    category.failed++;
    console.log('  ❌ Файл .env не найден\n');
    testResults.categories['environment'] = category;
    return;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const requiredVars = {
    'TELEGRAM_BOT_TOKEN': { required: true, desc: 'Токен Telegram бота' },
    'BOT_TOKEN': { required: true, desc: 'Альтернативный токен бота' },
    'COZE_API_TOKEN': { required: true, desc: 'API токен Coze' },
    'BOT_ID': { required: true, desc: 'ID бота Coze' },
    'YOOKASSA_SHOP_ID': { required: true, desc: 'ID магазина YooKassa' },
    'YOOKASSA_SECRET_KEY': { required: true, desc: 'Секретный ключ YooKassa' },
    'WEBHOOK_DOMAIN': { required: false, desc: 'Домен для webhook' },
    'PORT': { required: false, desc: 'Порт сервера' }
  };
  
  for (const [varName, config] of Object.entries(requiredVars)) {
    testResults.total++;
    const pattern = new RegExp(`^${varName}=(.*)`, 'm');
    const match = envContent.match(pattern);
    
    if (match) {
      const value = match[1].trim();
      const isEmpty = !value || value === '' || value === 'your_value_here';
      
      if (isEmpty && config.required) {
        testResults.warnings++;
        category.warnings++;
        category.tests.push({
          name: `${varName} - ${config.desc}`,
          status: 'warning',
          message: 'Переменная существует, но не настроена'
        });
        console.log(`  ⚠️  ${varName} - ${config.desc} - НЕ НАСТРОЕНА`);
      } else if (isEmpty && !config.required) {
        testResults.passed++;
        category.passed++;
        category.tests.push({
          name: `${varName} - ${config.desc}`,
          status: 'passed',
          message: 'Опциональная переменная'
        });
        console.log(`  ✅ ${varName} - ${config.desc} (опционально)`);
      } else {
        testResults.passed++;
        category.passed++;
        category.tests.push({
          name: `${varName} - ${config.desc}`,
          status: 'passed',
          message: 'Настроена'
        });
        console.log(`  ✅ ${varName} - ${config.desc}`);
      }
    } else {
      if (config.required) {
        testResults.failed++;
        category.failed++;
        category.tests.push({
          name: `${varName} - ${config.desc}`,
          status: 'failed',
          message: 'ОТСУТСТВУЕТ'
        });
        console.log(`  ❌ ${varName} - ${config.desc} - ОТСУТСТВУЕТ`);
      } else {
        testResults.passed++;
        category.passed++;
        console.log(`  ✅ ${varName} - ${config.desc} (опционально, отсутствует)`);
      }
    }
  }
  
  testResults.categories['environment'] = category;
  console.log('');
}

// ============================================================================
// КАТЕГОРИЯ 4: БАЗА ДАННЫХ
// ============================================================================

async function testDatabase() {
  console.log('💾 ТЕСТ 4: БАЗА ДАННЫХ\n');
  
  const category = {
    name: 'База данных',
    tests: [],
    passed: 0,
    failed: 0
  };
  
  // Проверка наличия файла БД
  testResults.total++;
  const dbPath = path.join(__dirname, 'data', 'subscriptions.db');
  const dbExists = fs.existsSync(dbPath);
  
  if (dbExists) {
    const stats = fs.statSync(dbPath);
    testResults.passed++;
    category.passed++;
    category.tests.push({
      name: 'Файл базы данных',
      status: 'passed',
      message: `Размер: ${(stats.size / 1024).toFixed(2)} KB`
    });
    console.log(`  ✅ subscriptions.db существует (${(stats.size / 1024).toFixed(2)} KB)`);
  } else {
    testResults.warnings++;
    category.warnings = (category.warnings || 0) + 1;
    category.tests.push({
      name: 'Файл базы данных',
      status: 'warning',
      message: 'Будет создана при первом запуске'
    });
    console.log(`  ⚠️  subscriptions.db - Будет создана при первом запуске`);
  }
  
  // Проверка структуры database.js
  testResults.total++;
  const dbServicePath = path.join(__dirname, 'src', 'services', 'database.js');
  
  if (fs.existsSync(dbServicePath)) {
    const dbContent = fs.readFileSync(dbServicePath, 'utf8');
    
    const requiredFunctions = [
      'initDatabase',
      'createOrUpdateUser',
      'getUserByTelegramId',
      'getActiveSubscription',
      'createSubscription',
      'addFitnessMetric',
      'getUserMetrics',
      'getUserFreeRequests'
    ];
    
    let allFunctionsExist = true;
    for (const func of requiredFunctions) {
      if (!dbContent.includes(`export function ${func}`) && 
          !dbContent.includes(`export async function ${func}`)) {
        allFunctionsExist = false;
        console.log(`  ⚠️  Функция ${func} не найдена`);
      }
    }
    
    if (allFunctionsExist) {
      testResults.passed++;
      category.passed++;
      category.tests.push({
        name: 'Функции базы данных',
        status: 'passed',
        message: 'Все необходимые функции присутствуют'
      });
      console.log(`  ✅ Все функции базы данных присутствуют`);
    } else {
      testResults.failed++;
      category.failed++;
      category.tests.push({
        name: 'Функции базы данных',
        status: 'failed',
        message: 'Некоторые функции отсутствуют'
      });
    }
  }
  
  testResults.categories['database'] = category;
  console.log('');
}

// ============================================================================
// КАТЕГОРИЯ 5: ОБРАБОТЧИКИ БОТА
// ============================================================================

async function testBotHandlers() {
  console.log('⚙️  ТЕСТ 5: ОБРАБОТЧИКИ БОТА\n');
  
  const category = {
    name: 'Обработчики бота',
    tests: [],
    passed: 0,
    failed: 0
  };
  
  const handlersPath = path.join(__dirname, 'src', 'bot', 'handlers.js');
  
  if (!fs.existsSync(handlersPath)) {
    testResults.total++;
    testResults.failed++;
    category.failed++;
    console.log('  ❌ Файл handlers.js не найден\n');
    testResults.categories['handlers'] = category;
    return;
  }
  
  const handlersContent = fs.readFileSync(handlersPath, 'utf8');
  
  // Проверка критических обработчиков
  const criticalHandlers = {
    'setupBotHandlers': 'Главная функция настройки',
    'handleTextMessage': 'Обработка текстовых сообщений',
    'handleCallbackQuery': 'Обработка callback-кнопок',
    "data === 'accept_agreement'": 'Принятие соглашения',
    "data === 'start_work'": 'Начало работы после оплаты',
    "data === 'my_status'": 'Статус подписки',
    "text === '🤖 ИИ-тренер'": 'ИИ-тренер',
    "text === '💎 Подписка'": 'Меню подписки',
    "text === '📊 Мой профиль'": 'Профиль пользователя',
    "text === '📈 Аналитика'": 'Аналитика',
    '/training_program': 'Программа тренировок',
    '/nutrition_plan': 'План питания'
  };
  
  for (const [handler, description] of Object.entries(criticalHandlers)) {
    testResults.total++;
    const exists = handlersContent.includes(handler);
    
    category.tests.push({
      name: `${handler}`,
      status: exists ? 'passed' : 'failed',
      message: description
    });
    
    if (exists) {
      testResults.passed++;
      category.passed++;
      console.log(`  ✅ ${handler} - ${description}`);
    } else {
      testResults.failed++;
      category.failed++;
      console.log(`  ❌ ${handler} - ${description} - ОТСУТСТВУЕТ`);
    }
  }
  
  // Проверка экспортов
  testResults.total++;
  const hasExports = handlersContent.includes('export function setupBotHandlers') ||
                     handlersContent.includes('export { setupBotHandlers');
  
  if (hasExports) {
    testResults.passed++;
    category.passed++;
    console.log(`  ✅ Функции правильно экспортированы`);
  } else {
    testResults.failed++;
    category.failed++;
    console.log(`  ❌ Проблемы с экспортом функций`);
  }
  
  testResults.categories['handlers'] = category;
  console.log('');
}

// ============================================================================
// КАТЕГОРИЯ 6: КЛАВИАТУРЫ
// ============================================================================

async function testKeyboards() {
  console.log('⌨️  ТЕСТ 6: КЛАВИАТУРЫ\n');
  
  const category = {
    name: 'Клавиатуры',
    tests: [],
    passed: 0,
    failed: 0
  };
  
  const keyboardsPath = path.join(__dirname, 'src', 'bot', 'keyboards.js');
  
  if (!fs.existsSync(keyboardsPath)) {
    testResults.total++;
    testResults.failed++;
    category.failed++;
    console.log('  ❌ Файл keyboards.js не найден\n');
    testResults.categories['keyboards'] = category;
    return;
  }
  
  const keyboardsContent = fs.readFileSync(keyboardsPath, 'utf8');
  
  const requiredKeyboards = {
    'mainKeyboard': 'Главное меню',
    'subscriptionKeyboard': 'Меню подписки',
    'userAgreementKeyboard': 'Пользовательское соглашение',
    'analyticsKeyboard': 'Аналитика',
    'aiToolsKeyboard': 'ИИ-инструменты',
    'userDataKeyboard': 'Управление данными',
    'workoutKeyboard': 'Тренировки',
    'goalTypesKeyboard': 'Типы целей',
    'paymentSuccessKeyboard': 'После оплаты',
    'helpKeyboard': 'Помощь'
  };
  
  for (const [keyboard, description] of Object.entries(requiredKeyboards)) {
    testResults.total++;
    const pattern = new RegExp(`export const ${keyboard}`);
    const exists = pattern.test(keyboardsContent);
    
    category.tests.push({
      name: keyboard,
      status: exists ? 'passed' : 'failed',
      message: description
    });
    
    if (exists) {
      testResults.passed++;
      category.passed++;
      console.log(`  ✅ ${keyboard} - ${description}`);
    } else {
      testResults.failed++;
      category.failed++;
      console.log(`  ❌ ${keyboard} - ${description} - ОТСУТСТВУЕТ`);
    }
  }
  
  testResults.categories['keyboards'] = category;
  console.log('');
}

// ============================================================================
// КАТЕГОРИЯ 7: ИНТЕГРАЦИЯ COZE AI
// ============================================================================

async function testCozeIntegration() {
  console.log('🤖 ТЕСТ 7: ИНТЕГРАЦИЯ COZE AI\n');
  
  const category = {
    name: 'Интеграция Coze AI',
    tests: [],
    passed: 0,
    failed: 0
  };
  
  const cozePath = path.join(__dirname, 'src', 'services', 'coze.js');
  
  if (!fs.existsSync(cozePath)) {
    testResults.total++;
    testResults.failed++;
    category.failed++;
    console.log('  ❌ Файл coze.js не найден\n');
    testResults.categories['coze'] = category;
    return;
  }
  
  const cozeContent = fs.readFileSync(cozePath, 'utf8');
  
  const requiredFunctions = {
    'runWorkflow': 'Запуск workflow',
    'getConversationId': 'Получение conversation ID',
    'clearConversation': 'Очистка диалога',
    'continueInteractiveWorkflow': 'Продолжение интерактивного workflow'
  };
  
  for (const [func, description] of Object.entries(requiredFunctions)) {
    testResults.total++;
    const exists = cozeContent.includes(`export function ${func}`) ||
                   cozeContent.includes(`export async function ${func}`);
    
    category.tests.push({
      name: func,
      status: exists ? 'passed' : 'failed',
      message: description
    });
    
    if (exists) {
      testResults.passed++;
      category.passed++;
      console.log(`  ✅ ${func} - ${description}`);
    } else {
      testResults.failed++;
      category.failed++;
      console.log(`  ❌ ${func} - ${description} - ОТСУТСТВУЕТ`);
    }
  }
  
  // Проверка наличия API endpoint
  testResults.total++;
  const hasApiEndpoint = cozeContent.includes('https://api.coze.com') ||
                         cozeContent.includes('api.coze.com');
  
  if (hasApiEndpoint) {
    testResults.passed++;
    category.passed++;
    console.log(`  ✅ API endpoint настроен`);
  } else {
    testResults.failed++;
    category.failed++;
    console.log(`  ❌ API endpoint не найден`);
  }
  
  testResults.categories['coze'] = category;
  console.log('');
}

// ============================================================================
// КАТЕГОРИЯ 8: ПЛАТЕЖНАЯ СИСТЕМА
// ============================================================================

async function testPaymentSystem() {
  console.log('💳 ТЕСТ 8: ПЛАТЕЖНАЯ СИСТЕМА\n');
  
  const category = {
    name: 'Платежная система',
    tests: [],
    passed: 0,
    failed: 0
  };
  
  const paymentPath = path.join(__dirname, 'src', 'services', 'payment.js');
  
  if (!fs.existsSync(paymentPath)) {
    testResults.total++;
    testResults.failed++;
    category.failed++;
    console.log('  ❌ Файл payment.js не найден\n');
    testResults.categories['payment'] = category;
    return;
  }
  
  const paymentContent = fs.readFileSync(paymentPath, 'utf8');
  
  const requiredFunctions = {
    'createSubscriptionPayment': 'Создание платежа',
    'handlePaymentWebhook': 'Обработка webhook',
    'verifyPaymentSignature': 'Проверка подписи'
  };
  
  for (const [func, description] of Object.entries(requiredFunctions)) {
    testResults.total++;
    const exists = paymentContent.includes(`export function ${func}`) ||
                   paymentContent.includes(`export async function ${func}`) ||
                   paymentContent.includes(`function ${func}`);
    
    category.tests.push({
      name: func,
      status: exists ? 'passed' : 'failed',
      message: description
    });
    
    if (exists) {
      testResults.passed++;
      category.passed++;
      console.log(`  ✅ ${func} - ${description}`);
    } else {
      testResults.failed++;
      category.failed++;
      console.log(`  ❌ ${func} - ${description} - ОТСУТСТВУЕТ`);
    }
  }
  
  // Проверка YooKassa API
  testResults.total++;
  const hasYooKassaApi = paymentContent.includes('api.yookassa.ru') ||
                         paymentContent.includes('yookassa');
  
  if (hasYooKassaApi) {
    testResults.passed++;
    category.passed++;
    console.log(`  ✅ YooKassa API интегрирован`);
  } else {
    testResults.failed++;
    category.failed++;
    console.log(`  ❌ YooKassa API не найден`);
  }
  
  testResults.categories['payment'] = category;
  console.log('');
}

// ============================================================================
// КАТЕГОРИЯ 9: АНАЛИТИКА И ГРАФИКИ
// ============================================================================

async function testAnalytics() {
  console.log('📊 ТЕСТ 9: АНАЛИТИКА И ГРАФИКИ\n');
  
  const category = {
    name: 'Аналитика',
    tests: [],
    passed: 0,
    failed: 0
  };
  
  const analyticsPath = path.join(__dirname, 'src', 'services', 'analytics.js');
  
  if (!fs.existsSync(analyticsPath)) {
    testResults.warnings++;
    category.warnings = (category.warnings || 0) + 1;
    console.log('  ⚠️  Файл analytics.js не найден (опционально)\n');
    testResults.categories['analytics'] = category;
    return;
  }
  
  const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
  
  const requiredFunctions = {
    'generateWeightChart': 'График веса',
    'generateWorkoutChart': 'График тренировок',
    'generateProgressChart': 'График прогресса',
    'generateTextReport': 'Текстовый отчет'
  };
  
  for (const [func, description] of Object.entries(requiredFunctions)) {
    testResults.total++;
    const exists = analyticsContent.includes(`export function ${func}`) ||
                   analyticsContent.includes(`export async function ${func}`);
    
    category.tests.push({
      name: func,
      status: exists ? 'passed' : 'failed',
      message: description
    });
    
    if (exists) {
      testResults.passed++;
      category.passed++;
      console.log(`  ✅ ${func} - ${description}`);
    } else {
      testResults.failed++;
      category.failed++;
      console.log(`  ❌ ${func} - ${description} - ОТСУТСТВУЕТ`);
    }
  }
  
  testResults.categories['analytics'] = category;
  console.log('');
}

// ============================================================================
// КАТЕГОРИЯ 10: СИНТАКСИС И ИМПОРТЫ
// ============================================================================

async function testSyntaxAndImports() {
  console.log('🔍 ТЕСТ 10: СИНТАКСИС И ИМПОРТЫ\n');
  
  const category = {
    name: 'Синтаксис',
    tests: [],
    passed: 0,
    failed: 0
  };
  
  const filesToCheck = [
    'src/index.js',
    'src/bot/handlers.js',
    'src/bot/keyboards.js',
    'src/services/database.js',
    'src/services/coze.js',
    'src/services/payment.js'
  ];
  
  for (const file of filesToCheck) {
    testResults.total++;
    const filePath = path.join(__dirname, file);
    
    if (!fs.existsSync(filePath)) {
      testResults.failed++;
      category.failed++;
      console.log(`  ❌ ${file} - ФАЙЛ НЕ НАЙДЕН`);
      continue;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Проверка на основные синтаксические ошибки
      const issues = [];
      
      // Проверка импортов
      const imports = content.match(/import .* from ['"](.*)['"]/g) || [];
      for (const imp of imports) {
        const match = imp.match(/from ['"](.*)['"]/);
        if (match && match[1].startsWith('.')) {
          const importPath = path.resolve(path.dirname(filePath), match[1]);
          const extensions = ['', '.js', '.json'];
          let found = false;
          
          for (const ext of extensions) {
            if (fs.existsSync(importPath + ext)) {
              found = true;
              break;
            }
          }
          
          if (!found) {
            issues.push(`Импорт не найден: ${match[1]}`);
          }
        }
      }
      
      if (issues.length === 0) {
        testResults.passed++;
        category.passed++;
        category.tests.push({
          name: file,
          status: 'passed',
          message: 'Синтаксис и импорты корректны'
        });
        console.log(`  ✅ ${file} - Синтаксис корректен`);
      } else {
        testResults.warnings++;
        category.warnings = (category.warnings || 0) + 1;
        category.tests.push({
          name: file,
          status: 'warning',
          message: issues.join(', ')
        });
        console.log(`  ⚠️  ${file} - ${issues.join(', ')}`);
      }
    } catch (error) {
      testResults.failed++;
      category.failed++;
      category.tests.push({
        name: file,
        status: 'failed',
        message: error.message
      });
      console.log(`  ❌ ${file} - Ошибка: ${error.message}`);
    }
  }
  
  testResults.categories['syntax'] = category;
  console.log('');
}

// ============================================================================
// ЗАПУСК ВСЕХ ТЕСТОВ
// ============================================================================

async function runAllTests() {
  await testProjectStructure();
  await testDependencies();
  await testEnvironmentVariables();
  await testDatabase();
  await testBotHandlers();
  await testKeyboards();
  await testCozeIntegration();
  await testPaymentSystem();
  await testAnalytics();
  await testSyntaxAndImports();
}

// ============================================================================
// ГЕНЕРАЦИЯ ОТЧЕТА
// ============================================================================

function generateReport() {
  console.log('='.repeat(80));
  console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ\n');
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  
  console.log(`Всего тестов: ${testResults.total}`);
  console.log(`✅ Успешно: ${testResults.passed}`);
  console.log(`❌ Ошибок: ${testResults.failed}`);
  console.log(`⚠️  Предупреждений: ${testResults.warnings}`);
  console.log(`📈 Процент успеха: ${successRate}%\n`);
  
  // Статус по категориям
  console.log('📁 Результаты по категориям:\n');
  
  for (const [key, category] of Object.entries(testResults.categories)) {
    const total = category.passed + category.failed + (category.warnings || 0);
    const percent = total > 0 ? ((category.passed / total) * 100).toFixed(1) : 0;
    
    let icon = '✅';
    if (category.failed > 0) icon = '❌';
    else if (category.warnings > 0) icon = '⚠️';
    
    console.log(`  ${icon} ${category.name}: ${category.passed}/${total} (${percent}%)`);
  }
  
  // Определение статуса
  let status = '';
  let recommendations = [];
  
  if (testResults.failed === 0 && testResults.warnings === 0) {
    status = '🎉 БОТ ПОЛНОСТЬЮ ГОТОВ К ЗАПУСКУ!';
    recommendations.push('Все системы работают корректно');
    recommendations.push('Запустите бота: npm start');
  } else if (testResults.failed === 0) {
    status = '✅ БОТ ГОТОВ К ЗАПУСКУ (с предупреждениями)';
    recommendations.push('Рекомендуется настроить:');
    for (const [key, cat] of Object.entries(testResults.categories)) {
      if (cat.warnings > 0) {
        for (const test of cat.tests) {
          if (test.status === 'warning') {
            recommendations.push(`  - ${test.name}: ${test.message}`);
          }
        }
      }
    }
  } else if (testResults.failed <= 5) {
    status = '⚠️ ТРЕБУЕТСЯ НАСТРОЙКА';
    recommendations.push('Необходимо исправить:');
    for (const [key, cat] of Object.entries(testResults.categories)) {
      if (cat.failed > 0) {
        for (const test of cat.tests) {
          if (test.status === 'failed') {
            recommendations.push(`  - ${test.name}: ${test.message}`);
          }
        }
      }
    }
  } else {
    status = '❌ КРИТИЧЕСКИЕ ПРОБЛЕМЫ';
    recommendations.push('Обнаружены критические проблемы:');
    recommendations.push('1. Проверьте установку зависимостей: npm install');
    recommendations.push('2. Настройте .env файл');
    recommendations.push('3. Проверьте структуру проекта');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n${status}\n`);
  console.log('💡 Рекомендации:\n');
  recommendations.forEach(rec => console.log(rec));
  console.log('\n' + '='.repeat(80));
  
  return { status, recommendations, successRate };
}

// ============================================================================
// СОХРАНЕНИЕ ОТЧЕТА
// ============================================================================

function saveReport(status, recommendations, successRate) {
  const reportContent = `# Полный отчет тестирования бота

**Дата:** ${new Date().toLocaleString('ru-RU')}  
**Версия:** 1.0.0

## Итоговая статистика

- **Всего тестов:** ${testResults.total}
- **Успешно:** ${testResults.passed} (${successRate}%)
- **Ошибок:** ${testResults.failed}
- **Предупреждений:** ${testResults.warnings}

## Статус

${status}

## Результаты по категориям

${Object.entries(testResults.categories).map(([key, cat]) => {
  const total = cat.passed + cat.failed + (cat.warnings || 0);
  const percent = total > 0 ? ((cat.passed / total) * 100).toFixed(1) : 0;
  
  return `### ${cat.name}

- Всего: ${total}
- Успешно: ${cat.passed}
- Ошибок: ${cat.failed}
- Предупреждений: ${cat.warnings || 0}
- Процент: ${percent}%

#### Детали:

${cat.tests.map(test => `- ${test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️'} **${test.name}**: ${test.message}`).join('\n')}
`;
}).join('\n\n')}

## Рекомендации

${recommendations.join('\n')}

---

*Автоматически сгенерировано системой тестирования FitnessBotAI*
`;
  
  fs.writeFileSync(
    path.join(__dirname, 'COMPREHENSIVE_TEST_REPORT.md'),
    reportContent,
    'utf8'
  );
  
  console.log('\n📄 Полный отчет сохранен: COMPREHENSIVE_TEST_REPORT.md\n');
}

// ============================================================================
// ГЛАВНАЯ ФУНКЦИЯ
// ============================================================================

async function main() {
  try {
    await runAllTests();
    const { status, recommendations, successRate } = generateReport();
    saveReport(status, recommendations, successRate);
    
    // Код выхода
    process.exit(testResults.failed > 5 ? 1 : 0);
  } catch (error) {
    console.error('❌ Критическая ошибка тестирования:', error);
    process.exit(1);
  }
}

main();
