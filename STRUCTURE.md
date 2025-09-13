# Структура проекта GymMindAI

## Основной проект (Telegram Bot)

Проект содержит только серверную часть - Telegram бот с ИИ-тренером.

```
FitnessBotAI/
├── src/                    # Исходный код
│   ├── index.js           # Главный файл приложения
│   ├── bot/               # Логика Telegram бота
│   │   ├── admin.js       # Админ команды
│   │   ├── handlers.js    # Обработчики сообщений
│   │   └── keyboards.js   # Клавиатуры
│   ├── services/          # Внешние сервисы
│   │   ├── analytics.js   # Аналитика
│   │   ├── coze.js        # Интеграция с Coze AI
│   │   ├── database.js    # База данных SQLite
│   │   └── payment.js     # Платежи ЮКасса
│   └── utils/             # Утилиты
│       └── helpers.js     # Вспомогательные функции
├── data/                  # База данных
│   └── subscriptions.db   # SQLite база данных
├── .env                   # Переменные окружения
├── .env.example           # Пример конфигурации
├── package.json           # Зависимости Node.js
├── deploy.sh              # Скрипт деплоя
├── ecosystem.config.json  # PM2 конфигурация
└── README.md              # Документация
```
```
FitnessBotAI/
├── src/                    # Исходный код
│   ├── index.js           # Главный файл приложения
│   ├── bot/               # Логика Telegram бота
│   │   ├── admin.js       # Админ команды
│   │   ├── handlers.js    # Обработчики сообщений
│   │   ├── keyboards.js   # Клавиатуры
│   │   └── keyboards_new.js
│   ├── services/          # Внешние сервисы
│   │   ├── analytics.js   # Аналитика
│   │   ├── coze.js        # Интеграция с Coze AI
│   │   ├── database.js    # База данных
│   │   ├── payment.js     # Платежи ЮКасса
│   │   └── sample-data.js
│   └── utils/             # Утилиты
│       └── helpers.js
├── data/                  # База данных (не в git)
├── .env.example           # Пример переменных окружения
├── package.json           # Зависимости проекта
├── docker-compose.yml     # Docker конфигурация
├── Dockerfile            # Docker образ
├── deploy.sh             # Скрипт деплоя
├── ecosystem.config.json # PM2 конфигурация
└── README.md             # Документация
```

## Мобильные приложения (отдельная папка)
```
FitnessBotAI_Mobile/
├── FitnessBotExpo/        # Expo React Native (рекомендуется)
│   ├── src/screens/       # Экраны приложения
│   ├── src/services/      # API сервисы
│   ├── App.tsx           # Главный компонент
│   └── package.json      # Зависимости Expo
├── FitnessBotMobile/     # Нативное React Native
├── mobile-app/           # Простое мобильное приложение
├── web-app/              # HTML/CSS/JS веб-версия
└── README.md             # Документация мобильных приложений
```

## Удаленные файлы и папки

### Временные и тестовые файлы:
- `temp/` - временные файлы
- `test/` - тестовые файлы
- `examples/` - примеры кода
- `.expo/` - кэш Expo

### Документация (дублирующаяся):
- `COZE_SETUP.md`
- `PROJECT_COMPLETE.md`
- `QUICKSTART.md`
- `READY_TO_USE.md`
- `SECURITY_INTEGRATION.md`
- `SECURITY_SOLUTION.md`
- `SERVER_REQUIREMENTS.md`
- `SETUP.md`

### Ненужные скрипты:
- `check_user.js`
- `reset_agreement.js`

## Преимущества новой структуры

1. **Разделение ответственности**: Telegram бот и мобильные приложения разделены
2. **Упрощенная структура**: Удалены дублирующиеся и временные файлы
3. **Лучшая организация**: Четкое разделение на бэкенд и фронтенд
4. **Удобство разработки**: Каждая часть может разрабатываться независимо
5. **Простота деплоя**: Основной бот можно деплоить отдельно от мобильных приложений
