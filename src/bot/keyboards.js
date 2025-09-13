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
      [{ text: '🧘‍♀️ Йога/Растяжка' }, { text: '🥊 Единоборства' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура данных пользователя
export const userDataKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '⚖️ Записать вес' }, { text: '🎯 Установить цель' }],
      [{ text: '🏋️‍♂️ Добавить тренировку' }, { text: '📊 Мои записи' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура просмотра записей
export const recordsKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '🏋️‍♂️ История тренировок' }, { text: '⚖️ История веса' }],
      [{ text: '🎯 Мои цели' }, { text: '📈 Прогресс' }],
      [{ text: '🗑️ Удалить записи' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура управления подпиской
export const subscriptionKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '💳 Оплатить подписку' }],
      [{ text: '📋 Статус подписки' }],
      [{ text: '📊 История платежей' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура выбора планов подписки
export const subscriptionPlansKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '💎 Базовый план - 150₽' }],
      [{ text: '⭐ Стандартный план - 300₽' }],
      [{ text: '🚀 Премиум план - 450₽' }],
      [{ text: '⬅️ Назад к подписке' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура для подтверждения оплаты
export const paymentConfirmKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '💳 Оплатить сейчас' }],
      [{ text: '⬅️ Назад к планам' }],
      [{ text: '⬅️ Назад в меню' }]
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
      [{ text: '🏋️‍♂️ /training_program' }, { text: '🥗 /nutrition_plan' }],
      [{ text: '🔬 /deepresearch' }, { text: '🧪 /composition_analysis' }],
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
export const userDataKeyboard2 = {
  reply_markup: {
    keyboard: [
      [{ text: '⚖️ Записать вес' }, { text: '🎯 Установить цель' }],
      [{ text: '🏋️‍♂️ Добавить тренировку' }, { text: '📊 Мои записи' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура управления записями для удаления
export const deleteRecordsKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '🗑️ Удалить тренировки' }, { text: '🗑️ Удалить веса' }],
      [{ text: '🗑️ Удалить цели' }, { text: '🗑️ Удалить всё' }],
      [{ text: '❌ Отмена' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура платежей
export const paymentKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '💳 Месяц - 299₽', callback_data: 'pay_monthly' }
      ],
      [
        { text: '🎯 3 месяца - 799₽ (-11%)', callback_data: 'pay_quarterly' }
      ],
      [
        { text: '🏆 Год - 2999₽ (-17%)', callback_data: 'pay_yearly' }
      ]
    ]
  }
};

// Клавиатура отмены
export const cancelKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '❌ Отмена' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура подтверждения
export const confirmKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '✅ Да' }, { text: '❌ Нет' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура подтверждения платежа
export const confirmPaymentKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '✅ Подтвердить', callback_data: 'confirm_payment' }
      ],
      [
        { text: '❌ Отмена', callback_data: 'cancel_payment' }
      ]
    ]
  }
};

// Клавиатура ссылки на платеж
export const paymentLinkKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '💳 Перейти к оплате', url: 'https://payment-link.example.com' }
      ]
    ]
  }
};

// Клавиатура управления подпиской (расширенная)
export const manageSubscriptionKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '💳 Продлить подписку' }],
      [{ text: '📋 Статус подписки' }],
      [{ text: '📊 История платежей' }],
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
      [{ text: '💳 Оформить подписку' }],
      [{ text: '📋 Преимущества подписки' }],
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
      [{ text: '💪 Силовая тренировка' }, { text: '🏃‍♂️ Кардио' }],
      [{ text: '🧘‍♀️ Йога/Растяжка' }, { text: '🥊 Единоборства' }],
      [{ text: '⬅️ Назад в меню' }]
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
      [{ text: '❌ Отмена' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура популярных упражнений
export const popularExercisesKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '🏋️‍♂️ Жим лежа' }, { text: '🏋️‍♂️ Приседания' }],
      [{ text: '🏋️‍♂️ Становая тяга' }, { text: '🏋️‍♂️ Подтягивания' }],
      [{ text: '📝 Другое упражнение' }],
      [{ text: '⬅️ Назад' }]
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
      [{ text: '🗑️ Удалить записи' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};
