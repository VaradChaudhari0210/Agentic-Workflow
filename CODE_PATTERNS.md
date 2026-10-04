# Common Code Patterns & Solutions

**Quick reference** for patterns the Backend Engineer Agent recognizes and implements.

---

## Table of Contents

- [API Patterns](#api-patterns)
- [Database Patterns](#database-patterns)
- [Authentication & Authorization](#authentication--authorization)
- [Error Handling](#error-handling)
- [Testing Patterns](#testing-patterns)
- [Performance Patterns](#performance-patterns)
- [Security Patterns](#security-patterns)

---

## API Patterns

### REST Endpoint Pattern

**The agent recognizes and implements**:

```typescript
// Standard REST controller pattern
@Controller('/api/users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  
  @Get(':id')
  @UseGuards(AuthGuard)
  async getUserById(
    @Param('id', ParseIntPipe) id: number
  ): Promise<UserDto> {
    try {
      const user = await this.userService.findById(id);
      if (!user) {
        throw new NotFoundException(`User #${id} not found`);
      }
      return this.mapToDto(user);
    } catch (error) {
      this.logger.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  }
}
```

**Key patterns**:
- ✅ Route decorators
- ✅ Dependency injection
- ✅ Auth guards
- ✅ Input validation
- ✅ Error handling
- ✅ DTO mapping
- ✅ Logging

---

### Request Validation Pattern

```typescript
// DTO with validation
import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;
  
  @IsEmail()
  email: string;
  
  @IsString()
  @MinLength(8)
  password: string;
  
  @IsOptional()
  @IsString()
  role?: string;
}

// Controller usage
@Post()
@UsePipes(new ValidationPipe())
async create(@Body() dto: CreateUserDto): Promise<UserDto> {
  return this.userService.create(dto);
}
```

**The agent adds**:
- Appropriate validators
- Error messages
- Optional field handling
- Type safety

---

### Pagination Pattern

```typescript
// Pagination DTO
export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;
  
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
  
  @IsOptional()
  @IsString()
  sortBy?: string;
  
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc';
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Service implementation
async findAll(dto: PaginationDto): Promise<PaginatedResponse<User>> {
  const { page, limit, sortBy, order } = dto;
  const skip = (page - 1) * limit;
  
  const [data, total] = await Promise.all([
    this.userRepo.find({
      skip,
      take: limit,
      order: sortBy ? { [sortBy]: order || 'asc' } : undefined,
    }),
    this.userRepo.count(),
  ]);
  
  return {
    data: data.map(this.mapToDto),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}
```

---

### Error Response Pattern

```typescript
// Standard error response
export class ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: Record<string, any>;
}

// Exception filter
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    
    const message = exception instanceof HttpException
      ? exception.message
      : 'Internal server error';
    
    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error: HttpStatus[status],
      timestamp: new Date().toISOString(),
      path: request.url,
    };
    
    response.status(status).json(errorResponse);
  }
}
```

---

## Database Patterns

### Repository Pattern

```typescript
// Generic repository
export class BaseRepository<T> {
  constructor(private readonly repo: Repository<T>) {}
  
  async findById(id: number): Promise<T | null> {
    return this.repo.findOne({ where: { id } as any });
  }
  
  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repo.find(options);
  }
  
  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }
  
  async update(id: number, data: DeepPartial<T>): Promise<T> {
    await this.repo.update(id, data as any);
    const updated = await this.findById(id);
    if (!updated) {
      throw new NotFoundException(`Entity #${id} not found`);
    }
    return updated;
  }
  
  async delete(id: number): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Entity #${id} not found`);
    }
  }
}
```

---

### Transaction Pattern

```typescript
// Service with transactions
@Injectable()
export class OrderService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly itemRepo: Repository<OrderItem>,
  ) {}
  
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    // Use transaction for consistency
    return this.dataSource.transaction(async (manager) => {
      // Create order
      const order = manager.create(Order, {
        userId: dto.userId,
        status: 'pending',
        total: 0,
      });
      await manager.save(order);
      
      // Create order items
      let total = 0;
      for (const item of dto.items) {
        const orderItem = manager.create(OrderItem, {
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        });
        await manager.save(orderItem);
        total += item.price * item.quantity;
      }
      
      // Update order total
      order.total = total;
      await manager.save(order);
      
      return order;
    });
  }
}
```

---

### N+1 Query Prevention

```typescript
// ❌ BAD: N+1 query problem
async getBlogPostsWithAuthors(): Promise<Post[]> {
  const posts = await this.postRepo.find();
  
  // This executes N queries (one per post)
  for (const post of posts) {
    post.author = await this.userRepo.findById(post.authorId);
  }
  
  return posts;
}

// ✅ GOOD: Single query with join
async getBlogPostsWithAuthors(): Promise<Post[]> {
  return this.postRepo.find({
    relations: ['author'], // Loads author in same query
  });
}

// ✅ GOOD: DataLoader pattern (for GraphQL)
const userLoader = new DataLoader(async (userIds: number[]) => {
  const users = await this.userRepo.findByIds(userIds);
  return userIds.map(id => users.find(u => u.id === id));
});

async getBlogPostsWithAuthors(): Promise<Post[]> {
  const posts = await this.postRepo.find();
  
  // Batches all requests into single query
  for (const post of posts) {
    post.author = await userLoader.load(post.authorId);
  }
  
  return posts;
}
```

---

## Authentication & Authorization

### JWT Auth Pattern

```typescript
// Auth service
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}
  
  async login(dto: LoginDto): Promise<TokenResponse> {
    // Validate credentials
    const user = await this.userService.findByEmail(dto.email);
    if (!user || !await bcrypt.compare(dto.password, user.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    // Generate tokens
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET,
    });
    
    return { accessToken, refreshToken };
  }
  
  async refresh(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      
      return this.login({ email: payload.email, password: '' }); // Generate new tokens
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}

// Auth guard
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}
  
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    
    try {
      const payload = this.jwtService.verify(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
  
  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    return authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;
  }
}
```

---

### Role-Based Access Control

```typescript
// Roles decorator
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Roles guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true; // No roles required
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }
    
    const hasRole = requiredRoles.some(role => user.roles?.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }
    
    return true;
  }
}

// Usage
@Get('admin/users')
@Roles('admin', 'superadmin')
@UseGuards(JwtAuthGuard, RolesGuard)
async getAllUsers(): Promise<User[]> {
  return this.userService.findAll();
}
```

---

## Error Handling

### Service Error Pattern

```typescript
// Custom exceptions
export class BusinessException extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'BusinessException';
  }
}

// Service with proper error handling
@Injectable()
export class PaymentService {
  constructor(
    private readonly logger: Logger,
    private readonly orderService: OrderService,
  ) {}
  
  async processPayment(dto: PaymentDto): Promise<PaymentResult> {
    try {
      // Validate order exists
      const order = await this.orderService.findById(dto.orderId);
      if (!order) {
        throw new BusinessException(
          `Order #${dto.orderId} not found`,
          'ORDER_NOT_FOUND',
          404
        );
      }
      
      // Check order status
      if (order.status !== 'pending') {
        throw new BusinessException(
          `Order #${dto.orderId} cannot be paid (status: ${order.status})`,
          'INVALID_ORDER_STATUS',
          400
        );
      }
      
      // Process payment
      const result = await this.paymentGateway.charge({
        amount: order.total,
        currency: 'USD',
        source: dto.paymentMethod,
      });
      
      // Update order
      await this.orderService.update(dto.orderId, {
        status: 'paid',
        paidAt: new Date(),
      });
      
      return result;
      
    } catch (error) {
      // Log error
      this.logger.error(
        `Payment processing failed for order ${dto.orderId}:`,
        error
      );
      
      // Re-throw business exceptions
      if (error instanceof BusinessException) {
        throw error;
      }
      
      // Wrap unexpected errors
      throw new BusinessException(
        'Payment processing failed',
        'PAYMENT_FAILED',
        500
      );
    }
  }
}
```

---

### Retry Pattern

```typescript
// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

// Usage
async fetchUserData(id: number): Promise<User> {
  return retryWithBackoff(
    () => this.httpService.get(`/api/users/${id}`),
    3,  // Max 3 retries
    1000 // Start with 1 second delay
  );
}
```

---

## Testing Patterns

### Unit Test Pattern

```typescript
describe('UserService', () => {
  let service: UserService;
  let repository: MockType<Repository<User>>;
  
  beforeEach(async () => {
    // Create mock repository
    const mockRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    
    // Create testing module
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepo,
        },
      ],
    }).compile();
    
    service = module.get<UserService>(UserService);
    repository = module.get(getRepositoryToken(User));
  });
  
  describe('findById', () => {
    it('should return user when found', async () => {
      // Arrange
      const mockUser = { id: 1, name: 'John', email: 'john@example.com' };
      repository.findOne.mockResolvedValue(mockUser);
      
      // Act
      const result = await service.findById(1);
      
      // Assert
      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });
    
    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });
});
```

---

### Integration Test Pattern

```typescript
describe('UserController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  
  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = moduleFixture.createNestApplication();
    await app.init();
    
    dataSource = app.get(DataSource);
  });
  
  afterAll(async () => {
    await dataSource.dropDatabase();
    await app.close();
  });
  
  beforeEach(async () => {
    // Clear database before each test
    await dataSource.synchronize(true);
  });
  
  describe('POST /users', () => {
    it('should create a new user', async () => {
      // Arrange
      const createDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };
      
      // Act
      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createDto)
        .expect(201);
      
      // Assert
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        name: createDto.name,
        email: createDto.email,
      });
      expect(response.body.password).toBeUndefined(); // Should not return password
    });
    
    it('should return 400 for invalid email', async () => {
      // Arrange
      const createDto = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'password123',
      };
      
      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createDto)
        .expect(400);
      
      expect(response.body.message).toContain('email');
    });
  });
});
```

---

## Performance Patterns

### Caching Pattern

```typescript
// Cache service
@Injectable()
export class CacheService {
  constructor(@InjectRedis() private readonly redis: Redis) {}
  
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }
  
  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }
}

// Cache decorator
export function Cacheable(ttl: number = 3600) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cache: CacheService = this.cacheService;
      const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
      
      // Try cache first
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Call original method
      const result = await originalMethod.apply(this, args);
      
      // Save to cache
      await cache.set(cacheKey, result, ttl);
      
      return result;
    };
    
    return descriptor;
  };
}

// Usage
@Injectable()
export class ProductService {
  constructor(private readonly cacheService: CacheService) {}
  
  @Cacheable(300) // Cache for 5 minutes
  async getPopularProducts(limit: number = 10): Promise<Product[]> {
    return this.productRepo.find({
      order: { views: 'DESC' },
      take: limit,
    });
  }
}
```

---

### Batch Processing Pattern

```typescript
// Process in batches to avoid memory issues
async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>,
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }
  
  return results;
}

// Usage
async sendEmailsToUsers(userIds: number[]): Promise<void> {
  await processBatch(
    userIds,
    100, // Process 100 at a time
    async (batch) => {
      const users = await this.userRepo.findByIds(batch);
      return Promise.all(
        users.map(user => this.emailService.send(user.email, 'Welcome!'))
      );
    }
  );
}
```

---

## Security Patterns

### Input Sanitization

```typescript
// Sanitize HTML input
import { sanitize } from 'isomorphic-dompurify';

@Injectable()
export class SanitizationService {
  sanitizeHtml(input: string): string {
    return sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'u', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href', 'title'],
    });
  }
  
  sanitizeFilename(input: string): string {
    // Remove path separators and special chars
    return input.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
}

// Usage in controller
@Post('content')
async createContent(@Body() dto: CreateContentDto): Promise<Content> {
  dto.body = this.sanitizationService.sanitizeHtml(dto.body);
  return this.contentService.create(dto);
}
```

---

### Rate Limiting Pattern

```typescript
// Rate limiter
@Injectable()
export class RateLimiterService {
  constructor(@InjectRedis() private readonly redis: Redis) {}
  
  async checkLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    
    return current <= maxRequests;
  }
}

// Rate limiter guard
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly limiter: RateLimiterService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = `rate_limit:${request.ip}:${request.path}`;
    
    const allowed = await this.limiter.checkLimit(key, 100, 60); // 100 req/min
    
    if (!allowed) {
      throw new HttpException('Too many requests', 429);
    }
    
    return true;
  }
}
```

---

**The agent recognizes and implements these patterns automatically based on your project's existing code style!**

For more examples, see [EXAMPLES.md](./EXAMPLES.md).

---

**Last Updated**: October 4, 2026  
**Version**: 1.0.0
