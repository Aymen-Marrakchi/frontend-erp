import { expect, Page, APIRequestContext } from "@playwright/test";

export interface SeededCommercialOrder {
  orderId: string;
  orderNo: string;
  customerId: string;
  productId: string;
}

interface AuthResult {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL || "admin@erp.com";
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD || "123456";
const API_URL = process.env.PLAYWRIGHT_API_URL || "http://127.0.0.1:5000/api";

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function loginAsAdmin(page: Page, request?: APIRequestContext) {
  if (request) {
    const auth = await authenticateAdmin(request);
    await page.addInitScript((user) => {
      localStorage.setItem("user", JSON.stringify(user));
    }, {
      id: auth.user.id,
      name: auth.user.name,
      email: auth.user.email,
      role: auth.user.role,
      token: auth.token,
    });
    await page.goto("/dashboard/admin");
    await expect(page).toHaveURL(/\/dashboard\/admin$/);
    return;
  }

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard\/admin$/);
}

export async function authenticateAdmin(request: APIRequestContext): Promise<AuthResult> {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function seedCommercialOrder(request: APIRequestContext): Promise<SeededCommercialOrder> {
  const auth = await authenticateAdmin(request);
  const unique = Date.now();

  const customerResponse = await request.post(`${API_URL}/commercial/customers`, {
    headers: authHeaders(auth.token),
    data: {
      name: `PW Customer ${unique}`,
      email: `pw-customer-${unique}@erp.com`,
      company: "Playwright QA",
      city: "Tunis",
      governorate: "Tunis",
    },
  });
  expect(customerResponse.ok()).toBeTruthy();
  const customer = await customerResponse.json();

  const productResponse = await request.post(`${API_URL}/stock/products`, {
    headers: authHeaders(auth.token),
    data: {
      sku: `PWPF${unique}`,
      name: `Playwright Product ${unique}`,
      type: "PRODUIT_FINI",
      unit: "pcs",
      purchasePrice: 10,
      isLotTracked: false,
      status: "ACTIVE",
    },
  });
  expect(productResponse.ok()).toBeTruthy();
  const product = await productResponse.json();

  const salePriceResponse = await request.patch(`${API_URL}/stock/products/${product._id}/sale-price`, {
    headers: authHeaders(auth.token),
    data: { salePrice: 20 },
  });
  expect(salePriceResponse.ok()).toBeTruthy();

  const stockEntryResponse = await request.post(`${API_URL}/stock/movements/entry`, {
    headers: authHeaders(auth.token),
    data: {
      productId: product._id,
      quantity: 25,
      sourceModule: "STOCK",
      sourceType: "PLAYWRIGHT_SEED",
      reference: `PW-STOCK-${unique}`,
      reason: "Playwright seed stock",
    },
  });
  expect(stockEntryResponse.ok()).toBeTruthy();

  const orderResponse = await request.post(`${API_URL}/commercial/orders`, {
    headers: authHeaders(auth.token),
    data: {
      orderNo: `PW-${unique}`,
      customerId: customer._id,
      lines: [
        {
          productId: product._id,
          quantity: 2,
          unitPrice: 20,
          discount: 0,
        },
      ],
      notes: "Playwright commercial tunnel",
    },
  });
  expect(orderResponse.ok()).toBeTruthy();
  const order = await orderResponse.json();

  return {
    orderId: order._id,
    orderNo: order.orderNo,
    customerId: customer._id,
    productId: product._id,
  };
}
