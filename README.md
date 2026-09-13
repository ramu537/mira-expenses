# Mira Expense Manager

A standalone React application containing only Mira's expense and budget experience. The existing Mira frontend and backend are not part of this folder and are not modified by it.

## Backend contract

The app uses the existing endpoints:

- `GET /api/expenses?start=YYYY-MM-DD&end=YYYY-MM-DD`
- `POST /api/expenses`
- `PUT /api/expenses/:id`
- `DELETE /api/expenses/:id`
- `GET /api/budgets?month=YYYY-MM`
- `PUT /api/budgets?month=YYYY-MM`

Local development defaults to `/api` and the Vite proxy target configured in `.env.example`. A deployed build can use `VITE_API_URL`.

## Authentication integration

Authentication UI and Firebase are intentionally omitted. When authentication is ready, call `configureAccessTokenProvider` from `src/api/client.js` once during application startup:

```js
configureAccessTokenProvider(async () => yourAuthSession.getAccessToken());
```

If no provider is configured, requests are sent without an `Authorization` header.

## Later setup

When you are ready to run the project, install the declared packages and use the scripts in `package.json`. No dependencies were installed and no build or test command was run while this source was created.

