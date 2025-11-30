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
