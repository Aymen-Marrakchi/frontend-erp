import { expect, test } from "@playwright/test";
import {
  authenticateAdmin,
  buildAuthHeaders,
  getOrderById,
  loginAsAdmin,
  seedCommercialOrder,
  waitForOrderStatus,
} from "./utils/commercialTunnel";

test.describe("Commercial tunnel", () => {
  test("shows the commercial workflow across ordonnancement, orders, preparation, shipments, and planning", async ({
    page,
    request,
  }) => {
    const auth = await authenticateAdmin(request);
    const seeded = await seedCommercialOrder(request);
    const headers = buildAuthHeaders(auth.token);

    await loginAsAdmin(page, request);

    await page.addInitScript(() => {
      window.open = () =>
        ({
          document: { documentElement: { innerHTML: "" } },
          focus() {},
          print() {},
        }) as unknown as Window;
    });

    await page.goto(`/dashboard/commercial/ordonnancement?order=${seeded.orderId}`);
    await expect(page.getByRole("heading", { name: "Ordonnancement" })).toBeVisible();

    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const ordonanceResponse = await request.post(
      "http://127.0.0.1:5000/api/commercial/orders/ordonance/bulk",
      {
        headers,
        data: {
          orders: [
            {
              orderId: seeded.orderId,
              plannedStartDate: today,
              plannedEndDate: tomorrow,
              lines: [{ productId: seeded.productId, allocatedQuantity: 2 }],
            },
          ],
        },
      }
    );
    expect(ordonanceResponse.ok()).toBeTruthy();
    await waitForOrderStatus(request, auth.token, seeded.orderId, "ORDONNANCED");

    await page.goto("/dashboard/commercial/orders");
    await expect(page.getByRole("heading", { name: "Commercial Orders" })).toBeVisible();
    await expect(page.getByRole("textbox").first()).toBeVisible();

    const confirmResponse = await request.post(
      `http://127.0.0.1:5000/api/commercial/orders/${seeded.orderId}/confirm`,
      { headers }
    );
    expect(confirmResponse.ok()).toBeTruthy();
    await waitForOrderStatus(request, auth.token, seeded.orderId, "CONFIRMED");

    await page.goto("/dashboard/commercial/preparation");
    await expect(page.getByRole("heading", { name: /Preparation|Prepared/i })).toBeVisible();
    await expect(page.getByRole("textbox").first()).toBeVisible();

    const prepareResponse = await request.post(
      `http://127.0.0.1:5000/api/commercial/orders/${seeded.orderId}/prepare`,
      { headers }
    );
    expect(prepareResponse.ok()).toBeTruthy();
    await waitForOrderStatus(request, auth.token, seeded.orderId, "PREPARED");

    const printResponse = await request.post(
      `http://127.0.0.1:5000/api/commercial/orders/${seeded.orderId}/print-picking-slip`,
      { headers }
    );
    expect(printResponse.ok()).toBeTruthy();

    const packingResponse = await request.post(
      `http://127.0.0.1:5000/api/commercial/orders/${seeded.orderId}/validate-packing`,
      { headers }
    );
    expect(packingResponse.ok()).toBeTruthy();

    await page.goto("/dashboard/commercial/shipments");
    await expect(page.getByRole("heading", { name: /Shipped|Shipments|Expédition|Expedition/i })).toBeVisible();
    await expect(page.getByRole("textbox").first()).toBeVisible();

    const shipResponse = await request.post(
      `http://127.0.0.1:5000/api/commercial/orders/${seeded.orderId}/ship`,
      {
        headers,
        data: { shippingCost: 10 },
      }
    );
    expect(shipResponse.ok()).toBeTruthy();
    await waitForOrderStatus(request, auth.token, seeded.orderId, "SHIPPED");

    await page.goto("/dashboard/commercial/planning");
    await expect(page.getByRole("heading", { name: /Unassigned Orders/i })).toBeVisible();

    const planResponse = await request.post(
      "http://127.0.0.1:5000/api/commercial/delivery-plans",
      {
        headers,
        data: {
          planDate: today,
          startDate: today,
          orderIds: [seeded.orderId],
          notes: "Playwright commercial tunnel",
        },
      }
    );
    expect(planResponse.ok()).toBeTruthy();
    const plan = await planResponse.json();
    expect(plan.planNo).toMatch(/PLAN-\d+-\d{2}\/\d{4}/);

    const finalOrder = await getOrderById(request, auth.token, seeded.orderId);
    expect(finalOrder.ordonnancedAt).toBeTruthy();
    expect(finalOrder.packingValidatedAt).toBeTruthy();
    expect(finalOrder.shippedAt).toBeTruthy();
    expect(finalOrder.status).toBe("SHIPPED");
  });
});
