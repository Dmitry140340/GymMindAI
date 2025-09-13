// Главное меню
export const mainKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '🤖 ИИ-тренер' }],
      [{ text: '🧬 ИИ-инструменты' }],
      [{ text: '💎 Подписка' }, { text: '📊 Мой профиль' }],
      [{ text: '📈 Аналитика' }, { text: '🎯 Мои данные' }],
      [{ text: '🔄 Новый диалог' }, { text: '❓ Помощь' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура пользовательского соглашения
export const userAgreementKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '📄 Прочитать соглашение', url: 'https://docs.google.com/document/d/1DpE7nXZANEF0D42agzNPynDjbMckk194kar3akUUq58/edit?usp=sharing' }
      ],
      [
        { text: '✅ Принимаю условия', callback_data: 'accept_agreement' }
      ],
      [
        { text: '❌ Отклонить', callback_data: 'decline_agreement' }
      ]
    ]
  }
};

// Клавиатура аналитики
export const analyticsKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '📈 График веса' }, { text: '🏋️‍♂️ График тренировок' }],
      [{ text: '📊 Общий отчет' }, { text: '🏆 Достижения' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура записи тренировки
export const workoutKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '💪 Силовая тренировка' }, { text: '🏃‍♂️ Кардио' }],
      [{ text: '🥊 Единоборства' }, { text: '🧘‍♀️ Йога/Растяжка' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура подписки
export const subscriptionKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '💳 Оформить подписку' }],
      [{ text: '📋 Мои подписки' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура подтверждения оплаты
export const confirmPaymentKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '✅ Подтвердить оплату' }],
      [{ text: '❌ Отмена' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура с ссылкой на оплату
export const paymentLinkKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '💳 Перейти к оплате' }],
      [{ text: '❌ Отмена' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура управления подпиской
export const manageSubscriptionKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '📊 Статистика использования' }],
      [{ text: '💳 Продлить подписку' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура для пользователей без подписки
export const noSubscriptionKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '💎 Подписка' }],
      [{ text: '📊 Мой профиль' }],
      [{ text: '🔄 Новый диалог' }, { text: '❓ Помощь' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура помощи
export const helpKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '💬 Как пользоваться ботом?' }],
      [{ text: '⚡ Что умеет ИИ-тренер?' }],
      [{ text: '💎 Информация о подписке' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура ИИ-инструментов
export const aiToolsKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '🍎 Анализ питания' }, { text: '💪 Советы по тренировкам' }],
      [{ text: '😴 Режим сна' }, { text: '🧘‍♀️ Ментальное здоровье' }],
      [{ text: '📊 Персональный план' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура типов целей
export const goalTypesKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '🏋️‍♂️ Набрать мышечную массу' }, { text: '⚖️ Снизить вес' }],
      [{ text: '💪 Увеличить силу' }, { text: '🏃‍♂️ Улучшить выносливость' }],
      [{ text: '🤸‍♂️ Повысить гибкость' }, { text: '⚡ Общая физподготовка' }],
      [{ text: '❌ Отмена' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура управления данными пользователя
export const userDataKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '⚖️ Записать вес' }, { text: '🎯 Установить цель' }],
      [{ text: '🏋️‍♂️ Добавить тренировку' }, { text: '📊 Мои записи' }],
      [{ text: '🗑️ Удалить записи' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура типов тренировок
export const workoutTypesKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '💪 Силовая' }, { text: '🏃‍♂️ Кардио' }],
      [{ text: '🥊 Единоборства' }, { text: '🧘‍♀️ Йога/Растяжка' }],
      [{ text: '❌ Отмена' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура детальной тренировки
export const detailedWorkoutKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '➕ Добавить упражнение' }],
      [{ text: '✅ Завершить тренировку' }],
      [{ text: '❌ Отменить тренировку' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура популярных упражнений
export const popularExercisesKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: 'Жим лежа' }, { text: 'Приседания' }],
      [{ text: 'Становая тяга' }, { text: 'Жим стоя' }],
      [{ text: 'Подтягивания' }, { text: 'Отжимания' }],
      [{ text: 'Жим ногами' }, { text: 'Тяга штанги' }],
      [{ text: 'Сгибания на бицепс' }, { text: 'Французский жим' }],
      [{ text: '✏️ Другое упражнение' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура просмотра записей
export const viewRecordsKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '🏋️‍♂️ История тренировок' }, { text: '⚖️ История веса' }],
      [{ text: '🎯 Мои цели' }, { text: '📈 Прогресс' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура управления записями
export const manageRecordsKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '✏️ Изменить последнюю запись' }],
      [{ text: '🗑️ Удалить последнюю запись' }],
      [{ text: '🔄 Пересчитать статистику' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура удаления записей
export const deleteRecordsKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '🗑️ Удалить последнюю тренировку' }],
      [{ text: '🗑️ Удалить последний вес' }],
      [{ text: '🗑️ Удалить все тренировки' }],
      [{ text: '🗑️ Удалить все записи веса' }],
      [{ text: '❌ Отмена' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};
