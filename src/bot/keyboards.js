// Главное меню
export const mainKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '🤖 ИИ-тренер' }],
      [{ text: '💎 Подписка' }, { text: '📊 Мой профиль' }],
      [{ text: '📈 Аналитика' }, { text: '🏋️‍♂️ Записать тренировку' }],
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
        { text: '🥉 Базовый - 150₽ (100 запросов)', callback_data: 'buy_basic' }
      ],
      [
        { text: '🥈 Стандартный - 300₽ (300 запросов)', callback_data: 'buy_standard' }
      ],
      [
        { text: '🥇 Премиум - 450₽ (600 запросов)', callback_data: 'buy_premium' }
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
