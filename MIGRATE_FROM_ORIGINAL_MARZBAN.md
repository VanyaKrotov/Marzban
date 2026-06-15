# Переход с оригинального Marzban на MarzbanNext

Эта инструкция описывает обновление существующей панели с сохранением базы
данных и конфигурации путём подмены управляющего скрипта `marzban`.

## 1. Создать резервную копию

Перед обновлением обязательно запустите:

```bash
marzban backup
```

Дополнительно сохраните текущий управляющий скрипт:

```bash
cp /usr/local/bin/marzban /root/marzban-script-original
```

Рекомендуется также сохранить каталоги панели:

```bash
cp -a /opt/marzban /root/marzban-opt-backup
cp -a /var/lib/marzban /root/marzban-data-backup
```

## 2. Подменить скрипт

Загрузите скрипт из репозитория форка:

```bash
curl -fsSL \
  https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh \
  -o /usr/local/bin/marzban

chmod 755 /usr/local/bin/marzban
```

Проверьте, что скрипт использует правильный репозиторий:

```bash
grep PROJECT_REPO /usr/local/bin/marzban
```

В выводе должно присутствовать:

```text
PROJECT_REPO="VanyaKrotov/Marzban"
```

## 3. Запустить обновление

```bash
marzban update
```

Скрипт должен:

1. Определить последний релиз форка.
2. Скачать Docker-образ из файлов GitHub Release.
3. Загрузить образ через `docker load`.
4. Обновить Docker Compose.
5. Перезапустить панель.
6. Применить Alembic-миграции при запуске.

## 4. Проверить результат

Проверьте состояние контейнеров:

```bash
docker compose -f /opt/marzban/docker-compose.yml ps
```

Посмотрите последние логи панели:

```bash
docker compose -f /opt/marzban/docker-compose.yml \
  logs --tail=200 marzban
```

Проверьте текущую миграцию:

```bash
docker compose -f /opt/marzban/docker-compose.yml \
  exec marzban alembic current
```

Ожидаемый head форка:

```text
9d3f4a7c2b11
```

После запуска проверьте:

- вход в панель;
- список пользователей и администраторов;
- лимиты и статистику пользователей;
- ссылки подписок;
- Xray-конфигурацию;
- подключение нод;
- назначение инбаундов нодам;
- выпуск и назначение сертификатов.

## Возможные ошибки миграции

Если в логах появляется:

```text
Can't locate revision
```

или:

```text
multiple heads
```

не запускайте обновление повторно. Сначала сравните текущую ревизию базы данных
с миграционной цепочкой форка.

Версия оригинальной панели должна находиться в общей Alembic-цепочке с форком.
Если оригинальная панель новее точки ответвления, миграции необходимо
объединить отдельно.

## Откат

Если обновление не удалось:

```bash
marzban down
cp /root/marzban-script-original /usr/local/bin/marzban
chmod 755 /usr/local/bin/marzban
```

Восстановите каталоги и базу данных из резервной копии, затем запустите
оригинальную панель:

```bash
marzban up
```

Возврата только старого Docker-образа может быть недостаточно, поскольку
форк мог уже изменить структуру базы данных. Для надёжного отката используйте
резервную копию базы, созданную до обновления.
