const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'bot', 'handlers.js');

// Читаем файл
let content = fs.readFileSync(filePath, 'utf8');

// Заменяем повреждённый эмодзи на правильный
// Ищем любой странный символ перед "Подписка"
content = content.replace(/if \(text === '[^']*\s*Подписка' \|\| text\.includes\('Подписка'\)\)/g, 
                         "if (text === '💎 Подписка' || text.includes('Подписка'))");

// Сохраняем файл
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Эмодзи исправлен в handlers.js');
