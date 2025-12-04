# Architecture Guidelines

## 1. Dependency Pattern: Abstraction & Validation

### Rule
**"The callee (dependency) handles validation; the caller uses it abstractly."**

- **Callee Responsibility**: The component receiving data (e.g., Repository, Service) must validate and verify the input. It should handle type narrowing, schema validation (e.g., Zod), and data mapping.
- **Caller Responsibility**: The component calling the dependency should pass data in its raw or semi-processed form without cluttering its own logic with validation details of the dependency.
- **Goal**: Maximize abstraction for the caller. The caller reads like a high-level flow description, while the callee encapsulates the "dirty work" of defensive programming.

### Example: Blockchain Event Handling
- **Caller (`BlockchainService`)**: Simply listens for events and passes the raw `log.args` to the repository. It doesn't know about DB schemas or Zod validation.
- **Callee (`BlockchainRepository`)**: Receives `unknown` data, validates it using Zod schemas, maps it to the database entity (`NewGame`), and handles persistence errors.

## 2. Result Pattern: Consistent Error Handling

### Rule
**"All Service methods return `Result<T>` with appropriate `HttpStatus` codes."**

### Result Type Definition
```typescript
// src/common/types/result.ts
interface SuccessResult<T> {
    success: true;
    data: T;
}

interface FailResult {
    success: false;
    errorMessage: string;
    statusCode?: number;
}

type Result<T> = SuccessResult<T> | FailResult;
```

### Usage Guidelines

1. **Service Layer**: All public methods must return `Result<T>`
   ```typescript
   async getUser(id: string): Promise<Result<User>> {
       try {
           const user = await this.repository.findById(id);
           if (!user) {
               return Result.fail('사용자를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
           }
           return Result.ok(user);
       } catch (error) {
           this.logger.error(`Get user failed: ${error.message}`);
           return Result.fail('사용자 조회에 실패했습니다.', HttpStatus.INTERNAL_SERVER_ERROR);
       }
   }
   ```

2. **HttpStatus Code Guidelines**
   - `HttpStatus.BAD_REQUEST (400)`: Invalid input, validation failure
   - `HttpStatus.NOT_FOUND (404)`: Resource not found
   - `HttpStatus.UNPROCESSABLE_ENTITY (422)`: Business logic failure (e.g., transaction reverted)
   - `HttpStatus.INTERNAL_SERVER_ERROR (500)`: Unexpected errors, DB failures

3. **Controller Layer**: Return Result directly
   ```typescript
   @Get(':id')
   async getUser(@Param('id') id: string) {
       return this.userService.getUser(id);
   }
   ```

4. **Service-to-Service Calls**: Check result before proceeding
   ```typescript
   const winnerResult = await this.winnersService.createWinner(data);
   if (!winnerResult.success) {
       this.logger.error(`Winner 생성 실패: ${winnerResult.errorMessage}`);
   }
   ```

### Benefits
- Consistent API response format
- No exception throwing for business logic errors
- Clear error categorization with HTTP status codes
- Easy to handle in frontend
