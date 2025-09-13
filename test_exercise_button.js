import { detailedWorkoutKeyboard } from './src/bot/keyboards.js';

console.log('🧪 Тестирование кнопки "Добавить упражнение"...\n');

// Проверяем клавиатуру
console.log('📋 detailedWorkoutKeyboard содержит:');
detailedWorkoutKeyboard.reply_markup.keyboard.forEach((row, i) => {
  row.forEach((button, j) => {
    console.log(`  ${i+1}.${j+1} "${button.text}"`);
  });
});

// Проверяем что кнопка имеет правильный эмодзи
const addExerciseButton = detailedWorkoutKeyboard.reply_markup.keyboard
  .flat()
  .find(button => button.text.includes('Добавить упражнение'));

if (addExerciseButton) {
  console.log(`\n✅ Найдена кнопка: "${addExerciseButton.text}"`);
  
  if (addExerciseButton.text === '➕ Добавить упражнение') {
    console.log('✅ Эмодзи правильный: ➕');
  } else {
    console.log(`❌ Неправильный эмодзи! Ожидался: "➕ Добавить упражнение", получен: "${addExerciseButton.text}"`);
  }
} else {
  console.log('❌ Кнопка "Добавить упражнение" не найдена!');
}

console.log('\n🎯 Тестирование завершено!');
