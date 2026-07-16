---
title: "Comprendre l'injection de dependances dans NestJS"
description: "Guide pratique des patterns d'injection de dependances dans NestJS : injection par constructeur, fournisseurs personnalises et strategies de test."
date: 2026-07-16
updated: 2026-07-16
tags: ["Backend", "NestJS", "Testing", "JavaScript"]
readTime: 8 min
slug: comprendre-linjection-de-dependances-dans-nestjs
---
L'injection de dependances (DI) est un pattern de conception dans lequel une classe reçoit ses dependances d'une source externe plutot que de les creer elle-meme. NestJS integre la DI dans son coeur, ce qui en fait l'un des frameworks les plus agreables pour construire des applications serveur testables et maintenables.

## Pourquoi l'injection de dependances ?

Sans DI, chaque classe est responsable de la creation de ses propres dependances :

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

Cela fonctionne, mais pose probleme. Vous ne pouvez pas facilement substituer `UserRepository` par un mock pendant les tests. Tout changement dans le constructeur de `UserRepository` casse `UsersService`. Les deux classes sont fortement couplees.

Avec DI, la meme classe devient :

```typescript
export class UsersService {
  constructor(private readonly repository: UserRepository) {}

  async findById(id: string): Promise<User> {
    return this.repository.findOne(id);
  }
}
```

`UsersService` ne se soucie plus de la creation de `UserRepository`. Il declare seulement ce dont il a besoin.

## Le conteneur DI de NestJS

NestJS gere les dependances via un conteneur IoC (Inversion of Control). Au demarrage de l'application, Nest enregistre tous les fournisseurs et resout le graphe de dependances automatiquement.

### Enregistrement dans un module

Chaque fournisseur doit etre enregistre dans un module :

```typescript
@Module({
  providers: [UsersService, UserRepository],
  controllers: [UsersController],
})
export class UsersModule {}
```

Le decorateur `@Module` indique a Nest quelles classes sont disponibles pour l'injection dans le scope de ce module. Par defaut, les fournisseurs sont des singletons.

### Injection par constructeur

Le pattern d'injection le plus courant est celui par constructeur :

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

Nest lit les metadonnees de type des parametres du constructeur et resout chacun depuis le conteneur. Pour les tokens non-classes (comme `CACHE_SERVICE`), on utilise le decorateur `@Inject()`.

## Fournisseurs personnalises

Toutes les dependances ne sont pas des classes. Vous pouvez avoir besoin d'injecter des valeurs de configuration, des bibliotheques externes ou des fonctions d'usine.

### Fournisseurs de valeur

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

### Fournisseurs d'usine

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

### Fournisseurs asynchrones

Pour les dependances necessitant une initialisation asynchrone :

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

Nest attend la resolution de la promesse avant d'injecter le resultat.

## Scopes des fournisseurs

Par defaut, les fournisseurs sont des singletons. Ce n'est pas toujours adapte :

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

Trois scopes existent :

- **DEFAULT** (singleton) — une instance par application
- **REQUEST** — une instance par requete entrante
- **TRANSIENT** — une nouvelle instance pour chaque injection

## Dependances circulaires

Les dependances circulaires surviennent quand deux classes dependent l'une de l'autre :

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

La solution est `forwardRef` :

```typescript
@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}
}
```

## Tests avec DI

Le principal avantage de la DI apparait lors de l'ecriture des tests :

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

## Pieges courants

### Oubli de @Injectable()

Si une classe a ses propres dependances mais n'a pas le decorateur `@Injectable()`, Nest leve une erreur.

### Fuites de limites de module

Un fournisseur enregistre dans `ModuleA` n'est pas disponible dans `ModuleB` sans la propriete `exports`.

### Conflits de tokens

L'utilisation de tokens sous forme de chaines brutes peut mener a des collisions. Mieux vaut utiliser des constantes.

## Resume

L'injection de dependances dans NestJS n'est pas une option — c'est le coeur du framework. Comprendre les fournisseurs, les scopes et les modules vous permet de construire des applications faiblement couplees, faciles a tester et agreables a maintenir.
