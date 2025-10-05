import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎯 ФИНАЛЬНАЯ ПРОВЕРКА РАБОТОСПОСОБНОСТИ БОТА\n');
console.log('=' .repeat(80) + '\n');

const checks = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  results: []
};

// 1. Проверка наличия основных файлов
console.log('📂 Проверка структуры проекта...\n');

const requiredFiles = [
  'src/index.js',
  'src/bot/handlers.js',
  'src/bot/keyboards.js',
  'src/services/database.js',
  'src/services/coze.js',
  'src/services/payment.js',
  'package.json',
  '.env'
];

requiredFiles.forEach(file => {
  checks.total++;
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    checks.passed++;
    checks.results.push({ type: 'success', message: `✅ ${file}` });
    console.log(`✅ ${file}`);
  } else {
    checks.failed++;
    checks.results.push({ type: 'error', message: `❌ ${file} - ОТСУТСТВУЕТ` });
    console.log(`❌ ${file} - ОТСУТСТВУЕТ`);
  }
});

// 2. Проверка зависимостей
console.log('\n📦 Проверка зависимостей...\n');

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')
);

const requiredDeps = [
  'node-telegram-bot-api',
  'axios',
  'dotenv',
  'express',
  'sqlite3',
  'uuid'
];

requiredDeps.forEach(dep => {
  checks.total++;
  if (packageJson.dependencies && packageJson.dependencies[dep]) {
    checks.passed++;
    checks.results.push({ 
      type: 'success', 
      message: `✅ ${dep} v${packageJson.dependencies[dep]}` 
    });
    console.log(`✅ ${dep} v${packageJson.dependencies[dep]}`);
  } else {
    checks.failed++;
    checks.results.push({ type: 'error', message: `❌ ${dep} - НЕ УСТАНОВЛЕН` });
    console.log(`❌ ${dep} - НЕ УСТАНОВЛЕН`);
  }
});

// 3. Проверка переменных окружения
console.log('\n🔐 Проверка переменных окружения...\n');

const envPath = path.join(__dirname, '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  
  const requiredEnvVars = [
    'BOT_TOKEN',
    'COZE_API_TOKEN',
    'BOT_ID',
    'YOOKASSA_SHOP_ID',
    'YOOKASSA_SECRET_KEY',
    'WEBHOOK_DOMAIN'
  ];
  
  requiredEnvVars.forEach(envVar => {
    checks.total++;
    const pattern = new RegExp(`^${envVar}=.+`, 'm');
    
    if (pattern.test(envContent)) {
      const value = envContent.match(pattern)[0].split('=')[1].trim();
      if (value && value !== 'your_value_here' && value !== '') {
        checks.passed++;
        checks.results.push({ 
          type: 'success', 
          message: `✅ ${envVar} - установлен` 
        });
        console.log(`✅ ${envVar} - установлен`);
      } else {
        checks.warnings++;
        checks.results.push({ 
          type: 'warning', 
          message: `⚠️  ${envVar} - не настроен` 
        });
        console.log(`⚠️  ${envVar} - не настроен`);
      }
    } else {
      checks.failed++;
      checks.results.push({ 
        type: 'error', 
        message: `❌ ${envVar} - отсутствует` 
      });
      console.log(`❌ ${envVar} - отсутствует`);
    }
  });
} else {
  checks.failed++;
  checks.results.push({ 
    type: 'error', 
    message: '❌ Файл .env не найден' 
  });
  console.log('❌ Файл .env не найден');
}

// 4. Проверка базы данных
console.log('\n💾 Проверка базы данных...\n');

const dbPath = path.join(__dirname, 'data', 'subscriptions.db');
checks.total++;

if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  checks.passed++;
  checks.results.push({ 
    type: 'success', 
    message: `✅ База данных существует (${(stats.size / 1024).toFixed(2)} KB)` 
  });
  console.log(`✅ База данных существует (${(stats.size / 1024).toFixed(2)} KB)`);
} else {
  checks.warnings++;
  checks.results.push({ 
    type: 'warning', 
    message: '⚠️  База данных будет создана при первом запуске' 
  });
  console.log('⚠️  База данных будет создана при первом запуске');
}

// 5. Проверка кода handlers.js
console.log('\n⚙️  Проверка обработчиков...\n');

const handlersPath = path.join(__dirname, 'src', 'bot', 'handlers.js');
const handlersContent = fs.readFileSync(handlersPath, 'utf8');

const criticalHandlers = [
  { name: 'start_work', pattern: /data === 'start_work'/ },
  { name: 'my_status', pattern: /data === 'my_status'/ },
  { name: 'pay_monthly', pattern: /data === 'pay_monthly'/ },
  { name: 'accept_agreement', pattern: /data === 'accept_agreement'/ },
  { name: 'main_menu', pattern: /data === 'main_menu'/ }
];

criticalHandlers.forEach(handler => {
  checks.total++;
  if (handler.pattern.test(handlersContent)) {
    checks.passed++;
    checks.results.push({ 
      type: 'success', 
      message: `✅ Обработчик ${handler.name} найден` 
    });
    console.log(`✅ Обработчик ${handler.name} найден`);
  } else {
    checks.failed++;
    checks.results.push({ 
      type: 'error', 
      message: `❌ Обработчик ${handler.name} отсутствует` 
    });
    console.log(`❌ Обработчик ${handler.name} отсутствует`);
  }
});

// 6. Проверка keyboards.js
console.log('\n⌨️  Проверка клавиатур...\n');

const keyboardsPath = path.join(__dirname, 'src', 'bot', 'keyboards.js');
const keyboardsContent = fs.readFileSync(keyboardsPath, 'utf8');

const criticalKeyboards = [
  'mainKeyboard',
  'subscriptionKeyboard',
  'userAgreementKeyboard',
  'aiToolsKeyboard',
  'analyticsKeyboard'
];

criticalKeyboards.forEach(keyboard => {
  checks.total++;
  const pattern = new RegExp(`export const ${keyboard}`);
  if (pattern.test(keyboardsContent)) {
    checks.passed++;
    checks.results.push({ 
      type: 'success', 
      message: `✅ Клавиатура ${keyboard} найдена` 
    });
    console.log(`✅ Клавиатура ${keyboard} найдена`);
  } else {
    checks.failed++;
    checks.results.push({ 
      type: 'error', 
      message: `❌ Клавиатура ${keyboard} отсутствует` 
    });
    console.log(`❌ Клавиатура ${keyboard} отсутствует`);
  }
});

// Итоговый отчет
console.log('\n' + '='.repeat(80));
console.log('\n📊 ИТОГОВЫЙ РЕЗУЛЬТАТ\n');

const totalChecks = checks.passed + checks.failed + checks.warnings;
const successRate = ((checks.passed / totalChecks) * 100).toFixed(1);

console.log(`Всего проверок: ${totalChecks}`);
console.log(`✅ Успешно: ${checks.passed}`);
console.log(`❌ Ошибок: ${checks.failed}`);
console.log(`⚠️  Предупреждений: ${checks.warnings}`);
console.log(`📈 Процент готовности: ${successRate}%\n`);

// Определяем статус бота
let botStatus = '';
let statusIcon = '';
let recommendations = [];

if (checks.failed === 0 && checks.warnings === 0) {
  botStatus = 'ПОЛНОСТЬЮ ГОТОВ К ЗАПУСКУ';
  statusIcon = '🎉';
  recommendations.push('Бот готов к использованию!');
  recommendations.push('Запустите бота командой: npm start');
} else if (checks.failed === 0) {
  botStatus = 'ГОТОВ К ЗАПУСКУ (с предупреждениями)';
  statusIcon = '✅';
  recommendations.push('Бот готов к запуску, но рекомендуется настроить:');
  checks.results.filter(r => r.type === 'warning').forEach(r => {
    recommendations.push(`  - ${r.message.replace('⚠️  ', '')}`);
  });
} else if (checks.failed <= 3) {
  botStatus = 'ТРЕБУЕТСЯ НАСТРОЙКА';
  statusIcon = '⚠️';
  recommendations.push('Для запуска бота необходимо исправить:');
  checks.results.filter(r => r.type === 'error').forEach(r => {
    recommendations.push(`  - ${r.message.replace('❌ ', '')}`);
  });
} else {
  botStatus = 'НЕ ГОТОВ К ЗАПУСКУ';
  statusIcon = '❌';
  recommendations.push('Критические проблемы:');
  checks.results.filter(r => r.type === 'error').forEach(r => {
    recommendations.push(`  - ${r.message.replace('❌ ', '')}`);
  });
  recommendations.push('\nРекомендуется:');
  recommendations.push('  1. Проверить установку зависимостей: npm install');
  recommendations.push('  2. Настроить файл .env');
  recommendations.push('  3. Запустить автоисправление: node auto_fix_buttons.js');
}

console.log(`${statusIcon} Статус: ${botStatus}\n`);
console.log('💡 Рекомендации:\n');
recommendations.forEach(rec => console.log(rec));

console.log('\n' + '='.repeat(80));

// Сохраняем отчет
const reportContent = `# Отчет о проверке готовности бота

**Дата проверки:** ${new Date().toLocaleString('ru-RU')}

## Результаты

- **Всего проверок:** ${totalChecks}
- **Успешно:** ${checks.passed}
- **Ошибок:** ${checks.failed}
- **Предупреждений:** ${checks.warnings}
- **Готовность:** ${successRate}%

## Статус

${statusIcon} **${botStatus}**

## Детальные результаты

${checks.results.map(r => r.message).join('\n')}

## Рекомендации

${recommendations.join('\n')}

---

*Автоматически сгенерирован системой проверки FitnessBotAI*
`;

fs.writeFileSync(
  path.join(__dirname, 'BOT_HEALTH_CHECK.md'),
  reportContent,
  'utf8'
);

console.log(`\n📄 Детальный отчет сохранен: BOT_HEALTH_CHECK.md\n`);

// Возвращаем код выхода
process.exit(checks.failed > 0 ? 1 : 0);
