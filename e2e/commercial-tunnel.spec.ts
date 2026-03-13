import { expect, test } from "@playwright/test";
import { loginAsAdmin, seedCommercialOrder } from "./utils/commercialTunnel";

test.describe("Commercial tunnel", () => {
  test("can move an order through confirm, prepare, ship, and planning", async ({ page, request }) => {
    const seeded = await seedCommercialOrder(request);

    await loginAsAdmin(page, request);

    await page.goto("/dashboard/commercial/orders");
    await page.getByPlaceholder(/Search orders|Rechercher des commandes/i).fill(seeded.orderNo);

    const orderRow = page.locator("div").filter({ hasText: seeded.orderNo }).first();
    await expect(orderRow).toBeVisible();

    await orderRow.getByRole("button", { name: /Confirm|Confirmer/i }).click();
    await expect(
      page.locator("div").filter({ hasText: seeded.orderNo }).first().getByRole("button", {
        name: /Prepare|Prepared|Préparer|Préparé/i,
      })
    ).toBeVisible();

    await page
      .locator("div")
      .filter({ hasText: seeded.orderNo })
      .first()
      .getByRole("button", { name: /Prepare|Prepared|Préparer|Préparé/i })
      .click();

    await page.goto("/dashboard/commercial/shipments");
    await page.getByPlaceholder(/Search shipment orders/i).fill(seeded.orderNo);
    await expect(page.getByText(seeded.orderNo).first()).toBeVisible();

    const preparedOrderRow = page.locator("div").filter({ hasText: seeded.orderNo }).filter({
      has: page.getByRole("button", { name: /^Ship$/i }),
    }).first();
    await preparedOrderRow.getByRole("button", { name: /^Ship$/i }).click();

    await expect(page.getByText("Orders in Transit")).toBeVisible();
    await expect(page.locator(`text=${seeded.orderNo}`).last()).toBeVisible();

    await page.goto("/dashboard/commercial/planning");
    await expect(page.getByText("Unassigned Orders")).toBeVisible();
    await expect(page.getByText(seeded.orderNo).first()).toBeVisible();

    await page.getByRole("button", { name: /New Plan/i }).click();

    const today = new Date().toISOString().slice(0, 10);
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(today);
    await dateInputs.nth(1).fill(today);

    await page.getByRole("button", { name: new RegExp(seeded.orderNo) }).click();
    await page.getByRole("button", { name: /Create Plan/i }).click();

    await expect(page.getByText(/PLAN-\d+-\d{2}\/\d{4}/).first()).toBeVisible();
  });
});
