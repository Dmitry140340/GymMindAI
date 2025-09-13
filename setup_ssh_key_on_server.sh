# ===== КОМАНДЫ ДЛЯ НАСТРОЙКИ SSH КЛЮЧА НА СЕРВЕРЕ =====
# Выполните эти команды после подключения к серверу по паролю

# 1. Создаем директорию для SSH ключей
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 2. Добавляем ваш публичный ключ
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCwpjMx/7KwrjmIyRgj/V4KoJLG1fBysDwcX4XtgjbVVcwIMonoJBATn17oMAllD8Da9z5yDy6XnZ3ibhCu+h2EYW1ctU4LFMwrYI1B5HGLOj+YRnTqRJiK3uy4ZdQmEC/UnDF23MmR0SjD4Epi3VxIChaJnl+mgtkbQZ9IMlmWCprnx6Tbr9UNSUzJJN6BECrV5W3N3YqT4E9M8KriaJsNEdy0H0WKhn//UFSKCDoL/xEEDOR9nXynSTfvavu5zamIpANZUu3Lm5ydcrvGdTaym4EUIsR4v6kVkI8+iHbDZStLA28QBnaRuhn1/8yupjzPFklXb9i+uKaoNr12S62TIZ77E8zVKjpVRn+P3cwtI3Vss9jyxX8Ovw0VBs2ACh6bbUhnR+1kKFnwb/8FIPlT968i0LWr1wZ7byotXT22eDmjbLGPMyOpp77m+F+aWOnNpETnqkVfS8Q0EoN0NZGDy5kBjQ+hArbR5x7Fh/2DvllJGHIOJ3WnOELn4vbMI4Wj8MwQ9x7XNCxHfE8tVLB6J+6NVQqx+IRtuNEeVtgUOnhrJ3xo1YE57ppnEWJWyTlBC1dwbtPkNWpNboRfpsnUgnM4iJ3JH/uis/F8v0VoCAh5bkyUOqSdJrxXKg1jCEFOlr4afkWHn3qoKUPbwGmOFlWckJmvSpGS1xs0HX166Q== zavalnyuk14@gmail.com" >> ~/.ssh/authorized_keys

# 3. Устанавливаем правильные права доступа
chmod 600 ~/.ssh/authorized_keys

# 4. Перезапускаем SSH сервис (опционально)
systemctl restart ssh

echo "✅ SSH ключ настроен! Теперь можно подключаться без пароля"
echo "Команда для подключения: ssh -i ~/.ssh/timeweb_fitnessbotai root@85.198.80.51"
