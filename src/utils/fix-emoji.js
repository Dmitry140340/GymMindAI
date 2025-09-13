import fs from 'fs';
import path from 'path';

async function fixEmojiInHandlers() {
  const filePath = 'src/bot/handlers.js';
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    console.log('🔍 Поиск поврежденных эмодзи...');
    
    // Ищем строку с поврежденным эмодзи
    const brokenLine = content.includes('�️‍♂️ Набрать мышечную массу');
    console.log('Найден поврежденный эмодзи:', brokenLine);
    
    if (brokenLine) {
      // Заменяем поврежденный эмодзи на правильный
      content = content.replace('�️‍♂️ Набрать мышечную массу', '🏋️‍♂️ Набрать мышечную массу');
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('✅ Поврежденный эмодзи исправлен!');
    } else {
      console.log('❌ Поврежденный эмодзи не найден');
    }
    
    // Проверяем результат
    const newContent = fs.readFileSync(filePath, 'utf8');
    const fixed = newContent.includes('🏋️‍♂️ Набрать мышечную массу');
    console.log('Проверка исправления:', fixed ? '✅ Исправлен' : '❌ Не исправлен');
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

fixEmojiInHandlers();
