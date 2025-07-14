# Стратегия тестирования фронтенда

## Обзор

Этот документ описывает стратегию тестирования для Angular приложения, включая unit тесты, интеграционные тесты и e2e тесты.

## Типы тестов

### 1. Unit тесты (Компоненты и сервисы)

**Цель**: Тестирование отдельных компонентов и сервисов в изоляции.

**Покрытие**:
- Логика компонентов
- Валидация форм
- Обработка событий
- Взаимодействие с сервисами
- Обработка ошибок

**Примеры созданных тестов**:
- `login.component.spec.ts` - тесты компонента логина
- `register.component.spec.ts` - тесты компонента регистрации
- `auth.service.spec.ts` - тесты AuthService

### 2. Интеграционные тесты

**Цель**: Тестирование взаимодействия между компонентами и модулями.

**Покрытие**:
- Взаимодействие компонентов
- Работа модулей
- Dependency injection
- Роутинг

**Примеры**:
- `auth.module.spec.ts` - тесты auth модуля

### 3. E2E тесты (End-to-End)

**Цель**: Тестирование полного пользовательского сценария.

**Покрытие**:
- Полный flow регистрации/логина
- Навигация между страницами
- Валидация UI
- Интеграция с бэкендом

## Ключевые сценарии для тестирования

### Авторизация

#### Логин
- ✅ Валидация формы (email, password, role)
- ✅ Автоматический выбор роли для admin@admin.net
- ✅ Проверка существования email
- ✅ Успешный логин для разных ролей
- ✅ Обработка ошибок
- ✅ Переключение темы
- ✅ Навигация после успешного логина

#### Регистрация
- ✅ Валидация формы (name, surname, email, password)
- ✅ Проверка совпадения паролей
- ✅ Эксклюзивный выбор роли
- ✅ Проверка существования email
- ✅ Блокировка уже существующих ролей
- ✅ Успешная регистрация нового пользователя
- ✅ Добавление новой роли существующему пользователю
- ✅ Обработка ошибок
- ✅ Показ/скрытие полей пароля

#### AuthService
- ✅ Логин пользователя
- ✅ Регистрация пользователя
- ✅ Проверка существования email
- ✅ Управление пользователем (setUser, setActiveRole)
- ✅ Работа с localStorage
- ✅ Обработка ошибок localStorage
- ✅ Логаут
- ✅ Получение списка учителей

## Запуск тестов

### Unit тесты
```bash
# Запуск всех unit тестов
ng test

# Запуск тестов с coverage
ng test --code-coverage

# Запуск тестов в watch режиме
ng test --watch
```

### E2E тесты
```bash
# Запуск e2e тестов
ng e2e

# Запуск e2e тестов в headless режиме
ng e2e --headless
```

## Структура тестов

### Компоненты
```typescript
describe('ComponentName', () => {
  let component: ComponentName;
  let fixture: ComponentFixture<ComponentName>;
  let service: jasmine.SpyObj<ServiceName>;

  beforeEach(async () => {
    // Setup TestBed
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Тесты валидации
  // Тесты методов
  // Тесты обработки событий
  // Тесты интеграции с сервисами
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
  // Тесты обработки ошибок
});
```

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

## Best Practices

### 1. Изоляция тестов
- Каждый тест должен быть независимым
- Используйте `beforeEach` для setup
- Очищайте состояние после каждого теста

### 2. Именование тестов
```typescript
it('should validate email format', () => {
  // test implementation
});

it('should handle successful login for student', () => {
  // test implementation
});
```

### 3. Группировка тестов
```typescript
describe('LoginComponent', () => {
  describe('Form Validation', () => {
    // validation tests
  });

  describe('Authentication', () => {
    // auth tests
  });

  describe('UI Interactions', () => {
    // UI tests
  });
});
```

### 4. Использование fakeAsync
```typescript
it('should handle async operations', fakeAsync(() => {
  // setup
  component.someAsyncMethod();
  tick();
  // assertions
}));
```

### 5. Mock HTTP запросов
```typescript
const req = httpMock.expectOne('http://localhost:3001/auth/login');
expect(req.request.method).toBe('POST');
req.flush(mockResponse);
```

## Coverage Goals

- **Unit тесты**: 80%+ покрытие кода
- **Интеграционные тесты**: Критические пути
- **E2E тесты**: Основные пользовательские сценарии

## Следующие шаги

1. **Добавить E2E тесты** для полного flow авторизации
2. **Тестировать guards** и interceptors
3. **Добавить тесты для других компонентов** (dashboard, settings, etc.)
4. **Настроить CI/CD** для автоматического запуска тестов
5. **Добавить visual regression тесты** для UI компонентов

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
``` 