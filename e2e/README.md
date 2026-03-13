## Playwright E2E

Minimal commercial tunnel smoke coverage:

- login as `ADMIN`
- seed customer, product, stock, and a draft sales order through the API
- confirm the order in the UI
- prepare the order in the UI
- ship the order from the expedition page
- verify the shipped order appears in delivery planning
- create a delivery plan

### Default assumptions

- frontend: `http://127.0.0.1:3000`
- backend API: `http://127.0.0.1:5000/api`
- admin credentials: `admin@erp.com / 123456`

### Optional env vars

- `PLAYWRIGHT_BASE_URL`
- `PLAYWRIGHT_API_URL`
- `PLAYWRIGHT_ADMIN_EMAIL`
- `PLAYWRIGHT_ADMIN_PASSWORD`
- `PLAYWRIGHT_FRONTEND_PORT`
- `PLAYWRIGHT_BACKEND_PORT`

### Commands

```bash
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
```

### Prerequisites

- backend running and connected to MongoDB
- frontend running or startable through Playwright webServer
- Playwright browsers installed
