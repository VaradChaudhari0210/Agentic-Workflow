# Usage Examples

## Basic Examples

### Example 1: Add a New API Endpoint

**Task:**
```bash
npm run dev task "Add GET /api/users/:id/statistics endpoint that returns user login count, last login date, and total posts"
```

**What the agent does:**

1. **Understanding Phase**
   - Reads `src/routes/` to understand routing patterns
   - Reads `src/controllers/` to understand controller structure
   - Reads `src/services/` to understand service patterns
   - Checks database schema for User model

2. **Planning Phase**
   ```
   Plan:
   1. Create UserStatsDto in src/dto/user-stats.dto.ts
   2. Add getStatistics method in src/services/user.service.ts
   3. Add statistics endpoint in src/controllers/user.controller.ts
   4. Add route in src/routes/user.routes.ts
   5. Add tests in src/tests/user.service.test.ts
   ```

3. **Implementation Phase**
   - Creates/modifies all planned files
   - Runs tests automatically
   - Retries if tests fail

4. **Review Phase**
   - Checks authorization is present
   - Checks input validation
   - Checks error handling
   - Checks tests are sufficient

5. **Result**
   - Shows git diff
   - Branch: `agent/task-xyz123`
   - Ready to review and merge

### Example 2: Fix a Bug

**Task:**
```bash
npm run dev task "Fix the race condition in src/services/session.service.ts where concurrent cleanup calls can delete active sessions"
```

**What the agent does:**

1. Reads the existing `session.service.ts`
2. Identifies the race condition
3. Plans fix (probably adding a mutex/lock)
4. Implements the fix
5. Adds test to verify race condition is fixed
6. Reviews for correctness

### Example 3: Add Authentication

**Task:**
```bash
npm run dev task "Add JWT authentication middleware that validates tokens from Authorization header and attaches user to request"
```

**What the agent does:**

1. Checks existing auth patterns in the repo
2. Looks for JWT library in dependencies
3. Creates plan:
   - Create middleware in `src/middleware/auth.middleware.ts`
   - Add JWT verification logic
   - Add user attachment to request
   - Update types for authenticated requests
   - Add tests
4. Implements following existing patterns
5. Reviews for security issues

### Example 4: Database Schema Change

**Task:**
```bash
npm run dev task "Add compound index on (userId, createdAt) to posts table for efficient user timeline queries"
```

**What the agent does:**

1. Inspects current database setup (Prisma/TypeORM)
2. Checks existing migration patterns
3. Creates migration file
4. Updates schema if needed
5. Adds notes about running migration

## Advanced Examples

### Example 5: Complex Feature with Multiple Files

**Task:**
```bash
npm run dev task "Add pagination support to all list endpoints: add page and pageSize query params, return total count and pagination metadata in responses"
```

**What the agent does:**

1. **Understanding Phase**
   - Identifies all list endpoints
   - Understands current response format
   - Checks repository patterns for queries

2. **Planning Phase**
   ```
   Plan:
   1. Create PaginationDto interface
   2. Create pagination utility function
   3. Update repository methods to support pagination
   4. Update all list endpoints to use pagination
   5. Update response type to include metadata
   6. Add tests for pagination logic
   ```

3. **Implementation**
   - Updates 10+ files consistently
   - Follows existing patterns
   - All endpoints paginate the same way

### Example 6: Refactoring

**Task:**
```bash
npm run dev task "Extract duplicate validation logic from user.controller.ts and post.controller.ts into a shared ValidationService"
```

**What the agent does:**

1. Reads both controllers
2. Identifies common validation patterns
3. Creates `ValidationService`
4. Updates controllers to use service
5. Ensures no behavior changes
6. Runs all tests

### Example 7: Security Enhancement

**Task:**
```bash
npm run dev task "Add rate limiting to authentication endpoints: 5 attempts per 15 minutes per IP"
```

**What the agent does:**

1. Checks existing middleware
2. Looks for rate limiting library
3. Creates rate limiting middleware
4. Applies to auth endpoints
5. Adds tests
6. Reviews for security concerns

## Real-World Workflow

### Scenario: Building a User Statistics Dashboard

**Step 1: Database**
```bash
npm run dev task "Add analytics table to track user page views with userId, page, timestamp, and sessionId"
```

Result: Migration created, Prisma schema updated

**Step 2: Service Layer**
```bash
npm run dev task "Create AnalyticsService with trackPageView and getUserPageViews methods"
```

Result: Service created following existing patterns

**Step 3: API Endpoints**
```bash
npm run dev task "Add POST /api/analytics/track endpoint for tracking page views and GET /api/analytics/users/:id/views for retrieving user analytics"
```

Result: Both endpoints created with proper validation

**Step 4: Middleware Integration**
```bash
npm run dev task "Create middleware that automatically tracks page views for all authenticated requests"
```

Result: Middleware created and integrated

**Step 5: Dashboard Endpoint**
```bash
npm run dev task "Add GET /api/analytics/dashboard endpoint that returns aggregated statistics: total views, unique users, popular pages"
```

Result: Complex aggregation query implemented

**Step 6: Testing**
```bash
npm run dev task "Add integration tests for analytics endpoints covering tracking, retrieval, and dashboard"
```

Result: Comprehensive test suite

Each step:
- Creates a separate branch
- Can be reviewed independently
- Can be merged incrementally
- Follows your project's patterns

## Tips for Better Results

### Be Specific About Constraints

❌ Bad:
```bash
npm run dev task "add caching"
```

✅ Good:
```bash
npm run dev task "Add Redis caching to getUserById in user.service.ts with 5 minute TTL and cache invalidation on user updates"
```

### Reference Existing Patterns

❌ Bad:
```bash
npm run dev task "create user export feature"
```

✅ Good:
```bash
npm run dev task "Add user export endpoint following the same pattern as the existing post export in src/controllers/post.controller.ts"
```

### Specify Security Requirements

❌ Bad:
```bash
npm run dev task "add admin endpoints"
```

✅ Good:
```bash
npm run dev task "Add admin endpoints for user management (list, suspend, delete) with role-based authorization requiring ADMIN role"
```

### Include Test Requirements

❌ Bad:
```bash
npm run dev task "fix the bug"
```

✅ Good:
```bash
npm run dev task "Fix the bug where getUserPosts returns deleted posts, and add test case to verify deleted posts are filtered out"
```

## Understanding Agent Behavior

### What the Agent is Good At

✅ Following existing patterns
✅ Creating boilerplate matching your style
✅ Adding tests that mirror existing tests
✅ Implementing well-defined features
✅ Refactoring with clear requirements
✅ Adding validation and error handling
✅ Creating consistent API endpoints

### What Requires More Guidance

⚠️ Architectural decisions (provide guidance in `.agent/architecture.md`)
⚠️ Performance optimization (be specific about constraints)
⚠️ Complex business logic (provide detailed requirements)
⚠️ Security-critical features (specify security requirements explicitly)

### What to Always Review

🔍 Authentication and authorization logic
🔍 Database migrations (especially on production)
🔍 Complex business logic
🔍 Performance-critical code
🔍 External API integrations

## Iterating with the Agent

If the first result isn't perfect:

1. **Review the output**
   ```bash
   git diff agent/task-xyz
   ```

2. **Provide more specific instructions**
   ```bash
   npm run dev task "Update the previous implementation to use Redis instead of in-memory cache and add error handling for Redis connection failures"
   ```

3. **Update your `.agent/` files** if the agent consistently misunderstands your patterns

4. **Use ADRs** to document decisions the agent should follow

## Integration with Your Workflow

### Daily Development

```bash
# Morning: Review pending agent branches
git branch | grep agent/

# Morning: Merge reviewed work
git checkout main
git merge agent/task-xyz

# Day: Assign new tasks to agent while you focus on complex problems
npm run dev task "Add email validation to registration endpoint"
# Continue working on complex architecture

# Evening: Review what the agent completed
git log --oneline
```

### Pair with Agent

You focus on:
- Architecture decisions
- Complex algorithms
- Performance optimization
- Business logic design

Agent handles:
- Boilerplate implementation
- Test creation
- API endpoint scaffolding
- Database query implementation
- Validation logic
- Error handling

### Code Review Process

```bash
# Agent creates implementation
npm run dev task "..."

# You review
git diff agent/task-xyz

# If changes needed, update .agent/ files or provide more specific task

# If good, merge
git checkout main
git merge agent/task-xyz --no-ff
git branch -d agent/task-xyz
```

## Troubleshooting Examples

### Agent creates wrong pattern

**Problem**: Agent uses wrong naming convention

**Solution**: Update `.agent/conventions.md`:
```markdown
## Service Methods

Always use this pattern:
- get{Entity}ById - fetch single
- get{Entity}List - fetch multiple
- create{Entity} - create
- update{Entity} - update
- delete{Entity} - delete
```

### Agent doesn't add authorization

**Problem**: Agent forgets authorization checks

**Solution**: Update `.agent/security.md`:
```markdown
## Authorization Pattern

EVERY controller method must:
1. Check authentication (req.user must exist)
2. Check authorization (verify req.user has required role/permission)
3. Return 401 if not authenticated
4. Return 403 if not authorized

Example:
if (!req.user) throw new UnauthorizedException();
if (!hasRole(req.user, 'ADMIN')) throw new ForbiddenException();
```

### Tests don't match your style

**Problem**: Agent writes tests differently than your style

**Solution**: Update `.agent/testing.md` with examples:
```markdown
## Test Style

Use this exact pattern:

describe('ServiceName', () => {
  describe('methodName', () => {
    it('should do X when Y', async () => {
      // Arrange
      const input = ...;
      
      // Act
      const result = await service.method(input);
      
      // Assert
      expect(result).toEqual(...);
    });
  });
});
```
