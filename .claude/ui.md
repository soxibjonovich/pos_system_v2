# UI

## Stack
- React 18 + TypeScript + TanStack Router
- Tailwind CSS for styling
- shadcn/ui for components (`frontend/src/components/ui/`)

## Rules
- Use shadcn components first; build custom only if needed
- Dark mode supported — use Tailwind `dark:` variants
- All user-facing text must use `useTranslate` hook (uz/en/ru)
- No hardcoded strings in JSX

## Layout
- Admin routes: `src/routes/admin/`
- Staff/POS: `src/routes/staff/`
- Login: `src/routes/login/`

## i18n
```ts
import { useTranslate } from '@/hooks/useTranslate'
const t = useTranslate()
// use t('key') — keys defined in src/i18n/translations.ts
```

## API Calls
- Endpoints configured in `src/config.tsx`
- Auth token from `auth-context.tsx`
- Always handle loading + error states

## Components
- Small, single-purpose components
- Props typed with `interface`
- No inline styles — Tailwind only
