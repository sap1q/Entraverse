# Entraver Workspace

Workspace ini berisi dua project:

- `entraverse`: frontend Next.js
- `entraverse-api`: backend Laravel

## Menjalankan dari root

Frontend:

```bash
npm run dev:frontend
```

Backend:

```bash
npm run dev:backend
```

Setup dasar:

```bash
npm run setup
```

Perintah tambahan:

```bash
npm run build:frontend
npm run lint:frontend
npm run test:frontend
npm run migrate:backend
npm run seed:backend
```

## Menjalankan manual

Frontend:

```bash
cd entraverse
npm run dev
```

Backend:

```bash
cd entraverse-api
php artisan serve --host=localhost --port=8000
```
