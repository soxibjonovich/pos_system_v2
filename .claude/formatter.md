# Formatter

## Python
- **Formatter:** `ruff format` (line length 88)
- **Linter:** `ruff check`
- **Imports:** sorted by `ruff` (stdlib → third-party → local)
- Type hints on all function signatures
- Async functions for all DB/IO operations

```bash
ruff format backend/
ruff check backend/ --fix
```

## TypeScript / React
- **Formatter:** Prettier (default config)
- **Linter:** ESLint with React + TS rules
- `interface` over `type` for object shapes
- Named exports only (no default exports in components)

```bash
cd frontend && npm run lint
cd frontend && npm run format
```

## General
- No trailing whitespace
- LF line endings
- 2-space indent for TS/TSX; 4-space for Python
