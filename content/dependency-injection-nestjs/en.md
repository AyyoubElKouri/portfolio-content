---
title: "Understanding Dependency Injection in NestJS"
description: "A practical guide to dependency injection patterns in NestJS: constructor injection, custom providers, and testing strategies."
---
Dependency Injection (DI) is a design pattern where a class receives its dependencies from an external source rather than creating them internally. NestJS builds DI into its core, making it one of the most pleasant frameworks for building testable, maintainable server-side applications.

## Why Dependency Injection?

Without DI, every class is responsible for creating its own dependencies:

```typescript
export class UsersService {
  private repository: UserRepository;

  constructor() {
    this.repository = new UserRepository();
  }

  async findById(id: string): Promise<User> {
    return this.repository.findOne(id);
  }
}
```

This works, but it has problems. You cannot easily substitute `UserRepository` with a mock during testing. Every change to the `UserRepository` constructor breaks `UsersService`. The two classes are tightly coupled.

With DI, the same class looks like this:

```typescript
export class UsersService {
  constructor(private readonly repository: UserRepository) {}

  async findById(id: string): Promise<User> {
    return this.repository.findOne(id);
  }
}
```

The `UsersService` no longer cares how `UserRepository` is created. It only declares what it needs.

## NestJS DI Container

NestJS manages dependencies through an IoC (Inversion of Control) container. When the application starts, Nest registers all providers and resolves the dependency graph automatically.

### Module Registration

Every provider must be registered in a module:

```typescript
@Module({
  providers: [UsersService, UserRepository],
  controllers: [UsersController],
})
export class UsersModule {}
```

The `@Module` decorator tells Nest which classes are available for injection within that module's scope. By default, providers are singletons — the same instance is shared across the entire application.

### Constructor Injection

The most common injection pattern is constructor-based:

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UserRepository,
    private readonly mailService: MailService,
    @Inject("CACHE_SERVICE") private readonly cache: ICacheService,
  ) {}
}
```

Nest reads the type metadata from the constructor parameters and resolves each one from the container. For non-class tokens (like `CACHE_SERVICE`), you use the `@Inject()` decorator explicitly.

## Custom Providers

Not every dependency is a class. You might need to inject configuration values, external libraries, or factory functions.

### Value Providers

```typescript
@Module({
  providers: [
    {
      provide: "DATABASE_URL",
      useValue: process.env.DATABASE_URL,
    },
  ],
})
export class AppModule {}
```

### Factory Providers

```typescript
@Module({
  providers: [
    {
      provide: "CACHE_SERVICE",
      useFactory: (config: ConfigService) => {
        return new RedisCacheService(config.get("redis.url"));
      },
      inject: [ConfigService],
    },
  ],
})
export class AppModule {}
```

Factory providers are powerful. They can conditionally select implementations based on environment variables or configuration.

### Async Providers

For dependencies that require asynchronous initialization (like database connections):

```typescript
@Module({
  providers: [
    {
      provide: "DATABASE_CONNECTION",
      useFactory: async (config: ConfigService) => {
        const connection = await createConnection(config.get("db"));
        return connection;
      },
      inject: [ConfigService],
    },
  ],
})
export class AppModule {}
```

Nest awaits the promise before injecting the result, so all consumers receive the resolved value.

## Provider Scopes

By default, providers are singletons. This is fine for most services, but not always:

```typescript
@Injectable({ scope: Scope.REQUEST })
export class RequestContext {
  private data: Map<string, unknown> = new Map();

  set(key: string, value: unknown): void {
    this.data.set(key, value);
  }

  get(key: string): unknown {
    return this.data.get(key);
  }
}
```

Three scopes exist:

- **DEFAULT** (singleton) — one instance per application
- **REQUEST** — one instance per incoming request
- **TRANSIENT** — a new instance for every injection

Request-scoped providers are useful for per-request context, but they add overhead. Nest must create a new instance for each request and manage its lifecycle.

## Circular Dependencies

Circular dependencies happen when two classes depend on each other:

```typescript
@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}
}

@Injectable()
export class UserService {
  constructor(private readonly authService: AuthService) {}
}
```

Nest cannot resolve this graph because each service requires the other to be instantiated first. The fix is `forwardRef`:

```typescript
@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}
}

@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}
}
```

`forwardRef` wraps one side of the dependency, telling Nest to defer resolution. A better solution is to break the cycle by extracting the shared dependency into a third class.

## Testing with DI

The main benefit of DI becomes obvious when writing tests. Dependencies can be swapped with mocks effortlessly:

```typescript
describe("UsersService", () => {
  let service: UsersService;
  let repository: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UserRepository, useValue: repository },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it("should find a user by id", async () => {
    repository.findOne.mockResolvedValue({ id: "1", name: "Alice" });

    const result = await service.findById("1");

    expect(repository.findOne).toHaveBeenCalledWith("1");
    expect(result).toEqual({ id: "1", name: "Alice" });
  });
});
```

Nest's `Test.createTestingModule` creates a lightweight DI container where you can override any provider with a mock. No database, no network calls — just fast, isolated tests.

## Common Pitfalls

### Forgetting @Injectable()

If a class has its own dependencies but is missing the `@Injectable()` decorator, Nest throws a runtime error:

```
Nest can't resolve dependencies of the UsersService.
```

Add `@Injectable()` to every class that Nest manages.

### Module Boundary Leaks

A provider registered in `ModuleA` is not available in `ModuleB` unless `ModuleA` exports it:

```typescript
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

Without the `exports` array, `UsersService` stays private to the module.

### Provider Token Conflicts

Using raw string tokens can lead to collisions:

```typescript
@Injectable()
export class PaymentService {
  constructor(@Inject("DATABASE") private readonly db: Database) {}
}
```

Better to use an injection token constant:

```typescript
export const DATABASE = "DATABASE";
```

Or better yet, use a class as the token so TypeScript catches mismatches.

## Summary

Dependency Injection in NestJS is not an optional feature — it is the framework. Understanding providers, scopes, and modules lets you build applications that are loosely coupled, easy to test, and a pleasure to maintain. Start with constructor injection, use factories for complex setup, and let Nest handle the wiring.
