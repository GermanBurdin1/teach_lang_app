# Тестирование фронтенда

## Созданные тесты

### Unit тесты

1. **LoginComponent** (`login.component.spec.ts`)
   - Валидация формы
   - Автоматический выбор роли для admin
   - Проверка существования email
   - Успешный логин для разных ролей
   - Обработка ошибок
   - Переключение темы

2. **RegisterComponent** (`register.component.spec.ts`)
   - Валидация формы
   - Проверка совпадения паролей
   - Эксклюзивный выбор роли
   - Проверка существования email
   - Блокировка существующих ролей
   - Успешная регистрация
   - Обработка ошибок

3. **AuthService** (`auth.service.spec.ts`)
   - Логин и регистрация
   - Проверка email
   - Управление пользователем
   - Работа с localStorage
   - Обработка ошибок

### Интеграционные тесты

4. **AuthModule** (`auth.module.spec.ts`)
   - Создание модуля
   - Dependency injection

### E2E тесты

5. **Authentication Flow** (`auth.e2e-spec.ts`)
   - Отображение форм
   - Валидация форм
   - Навигация между страницами
   - Переключение темы
   - Видимость пароля
   - Автоматический выбор роли admin

## Запуск тестов

### Предварительные требования

```bash
# Установка зависимостей
npm install

# Установка Playwright для E2E тестов (опционально)
npm install -D @playwright/test
npx playwright install
```

### Unit тесты

```bash
# Запуск всех unit тестов
ng test

# Запуск тестов с coverage
ng test --code-coverage

# Запуск тестов в watch режиме
ng test --watch

# Запуск тестов в headless режиме
ng test --watch=false --browsers=ChromeHeadless
```

### E2E тесты

```bash
# Запуск E2E тестов (требует запущенное приложение)
ng serve &
ng e2e

# Запуск E2E тестов с Playwright
npx playwright test

# Запуск E2E тестов в headless режиме
npx playwright test --headless
```

## Структура тестов

### Компоненты
```typescript
describe('ComponentName', () => {
  let component: ComponentName;
  let fixture: ComponentFixture<ComponentName>;
  let service: jasmine.SpyObj<ServiceName>;

  beforeEach(async () => {
    // Setup TestBed с моками
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Тесты валидации
  // Тесты методов
  // Тесты обработки событий
});
```

### Сервисы
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    // Setup TestBed
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Тесты HTTP запросов
  // Тесты бизнес-логики
});
```

## Ключевые сценарии покрытые тестами

### Логин
- ✅ Валидация формы (email, password, role)
- ✅ Автоматический выбор роли для admin@admin.net
- ✅ Проверка существования email
- ✅ Успешный логин для student/teacher/admin
- ✅ Обработка ошибок авторизации
- ✅ Переключение темы
- ✅ Навигация после успешного логина

### Регистрация
- ✅ Валидация формы (name, surname, email, password)
- ✅ Проверка совпадения паролей
- ✅ Эксклюзивный выбор роли
- ✅ Проверка существования email
- ✅ Блокировка уже существующих ролей
- ✅ Успешная регистрация нового пользователя
- ✅ Добавление новой роли существующему пользователю
- ✅ Обработка ошибок
- ✅ Показ/скрытие полей пароля

### AuthService
- ✅ Логин пользователя
- ✅ Регистрация пользователя
- ✅ Проверка существования email
- ✅ Управление пользователем (setUser, setActiveRole)
- ✅ Работа с localStorage
- ✅ Обработка ошибок localStorage
- ✅ Логаут
- ✅ Получение списка учителей

## Mock объекты

### AuthService
```typescript
const authServiceSpy = jasmine.createSpyObj('AuthService', [
  'login', 'register', 'checkEmailExists', 'setUser', 'setActiveRole'
]);
```

### Router
```typescript
const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
```

### NotificationService
```typescript
const notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['error']);
```

## Полезные команды

```bash
# Генерация coverage отчета
ng test --code-coverage --watch=false

# Запуск тестов в определенном браузере
ng test --browsers=ChromeHeadless

# Запуск тестов с verbose output
ng test --verbose

# Запуск только failed тестов
ng test --watch=false --browsers=ChromeHeadless --reporter=verbose

# Запуск конкретного теста
ng test --include="**/login.component.spec.ts"

# Запуск тестов с определенным паттерном
ng test --include="**/*.spec.ts" --grep="should validate"
```

## Troubleshooting

### Ошибки TypeScript
Если возникают ошибки с типами тестов в IDE:
```bash
# Убедитесь, что типы Jasmine установлены
npm install -D @types/jasmine

# Установка типов для Playwright
npm install -D @playwright/test

# Перезапустите TypeScript Language Service в VS Code
# Ctrl+Shift+P -> "TypeScript: Restart TS Server"
```

**Важно**: Ошибки типов в IDE не влияют на выполнение тестов через `ng test`. Тесты будут работать корректно при запуске, даже если IDE показывает ошибки.

### Статус тестов
- ✅ `auth.service.spec.ts` - Исправлен и готов к запуску
- ✅ `login.component.spec.ts` - Исправлены ошибки компиляции  
- ✅ `register.component.spec.ts` - Готов к запуску
- ✅ `auth.e2e-spec.ts` - E2E тесты созданы

**Примечание**: Ошибки TypeScript в IDE связаны с настройками Language Server и не препятствуют выполнению тестов.

### Ошибки с Material компонентами
Убедитесь, что все необходимые Material модули импортированы в тестах:
```typescript
imports: [
  MatFormFieldModule,
  MatInputModule,
  MatButtonModule,
  MatCheckboxModule,
  MatSnackBarModule,
  BrowserAnimationsModule
]
```

### Ошибки с HTTP запросами
Для тестирования HTTP запросов используйте `HttpClientTestingModule`:
```typescript
imports: [HttpClientTestingModule]
```

## Следующие шаги

1. **Добавить тесты для других компонентов** (dashboard, settings, etc.)
2. **Тестировать guards** и interceptors
3. **Добавить тесты для pipes** и directives
4. **Настроить CI/CD** для автоматического запуска тестов
5. **Добавить visual regression тесты**
6. **Улучшить coverage** до 80%+

## Coverage Goals

- **Unit тесты**: 80%+ покрытие кода
- **Интеграционные тесты**: Критические пути
- **E2E тесты**: Основные пользовательские сценарии

## Документация

Подробная документация по стратегии тестирования находится в файле `TESTING_STRATEGY.md`. 