# WellWatch AI

## Backend

The Django/DRF API lives in `backend/` and is PostgreSQL-ready. Create a virtual
environment, install `backend/requirements.txt`, then run:

```bash
cd backend
export DATABASE_URL=sqlite:///dev.sqlite3  # omit in production; use POSTGRES_* instead
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Authentication is available at `POST /api/login` (token or session), with
`POST /api/logout`. Check-ins are limited to one per local day and team
statistics intentionally expose aggregate values only.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
