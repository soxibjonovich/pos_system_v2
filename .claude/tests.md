# Tests

## Backend
- Use `pytest` + `httpx.AsyncClient`
- Test against real DB (SQLite in-memory via `DATABASE_URL=sqlite+aiosqlite:///:memory:`)
- No mocking the database — use actual async sessions
- Each service tested independently; mock only external HTTP calls (`service_client.py`)

### Structure
```
backend/<service>/tests/
  test_api.py     # endpoint tests
  test_crud.py    # DB logic tests
```

### Run
```bash
docker exec -it <service>_api pytest
```

## Frontend
- Use Vitest + React Testing Library
- Test components in isolation; mock API calls with `msw`
- No snapshot tests — prefer behavior tests

### Run
```bash
cd frontend && npm test
```

## Rules
- Test happy path + main error cases only
- No tests for internal helpers unless complex logic
- Integration tests > unit tests for CRUD
