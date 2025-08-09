// Главное меню
export const mainKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '🤖 Доступ к ИИ-тренеру' }],
      [{ text: '💎 Подписка' }, { text: '📊 Мой профиль' }],
      [{ text: '📈 Аналитика' }, { text: '🏋️‍♂️ Записать тренировку' }],
      [{ text: '🔄 Новый диалог' }, { text: '❓ Помощь' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
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
      [{ text: '🧘‍♀️ Йога/Растяжка' }, { text: '🏋️‍♀️ Функциональная' }],
      [{ text: '⬅️ Назад в меню' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Клавиатура для подписки
export const subscriptionKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '📅 1 месяц - 999₽', callback_data: 'buy_monthly' }
      ],
      [
        { text: '📅 1 год - 9990₽ (-17%)', callback_data: 'buy_yearly' }
      ],
      [
        { text: '⬅️ Назад', callback_data: 'back_to_main' }
      ]
    ]
  }
};

// Клавиатура подтверждения покупки
export const confirmPaymentKeyboard = (planType) => ({
  reply_markup: {
    inline_keyboard: [
      [
        { text: '✅ Оплатить', callback_data: `confirm_payment_${planType}` }
      ],
      [
        { text: '❌ Отмена', callback_data: 'cancel_payment' }
      ]
    ]
  }
});

// Клавиатура с ссылкой на оплату
export const paymentLinkKeyboard = (paymentUrl) => ({
  reply_markup: {
    inline_keyboard: [
      [
        { text: '💳 Перейти к оплате', url: paymentUrl }
      ],
      [
        { text: '❌ Отмена', callback_data: 'cancel_payment' }
      ]
    ]
  }
});

// Клавиатура для управления подпиской
export const manageSubscriptionKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '📊 Статус подписки', callback_data: 'subscription_status' }
      ],
      [
        { text: '💳 Продлить подписку', callback_data: 'extend_subscription' }
      ],
      [
        { text: '⬅️ Назад', callback_data: 'back_to_main' }
      ]
    ]
  }
};

// Клавиатура для неактивной подписки
export const noSubscriptionKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '💎 Купить подписку', callback_data: 'show_subscription_plans' }
      ],
      [
        { text: '⬅️ Назад', callback_data: 'back_to_main' }
      ]
    ]
  }
};

// Клавиатура помощи
export const helpKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '🤖 Как пользоваться ИИ', callback_data: 'help_ai' }
      ],
      [
        { text: '💳 Вопросы по оплате', callback_data: 'help_payment' }
      ],
      [
        { text: '📞 Связаться с поддержкой', callback_data: 'help_support' }
      ],
      [
        { text: '⬅️ Назад', callback_data: 'back_to_main' }
      ]
    ]
  }
};
