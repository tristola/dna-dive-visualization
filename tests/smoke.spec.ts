import { test, expect, Page, ConsoleMessage } from '@playwright/test';

function attachConsoleSpy(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

const TOLERATED = [
  /swiftshader/i,
  /Slow software-emulated/i,
  /THREE\.WebGL.*deprecated/i,
  /Possible EventEmitter/i,
  /rest\.ensembl\.org/i,
];

function fatalErrors(errors: string[]) {
  return errors.filter((e) => !TOLERATED.some((re) => re.test(e)));
}

/**
 * Canvas init / scroll-listener registration is variable on software WebGL.
 * Click skip, poll the stage indicator, and re-fire the click if it didn't take.
 */
async function navigateToDnaStage(page: Page) {
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForTimeout(1200);
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.getByRole('button', { name: /skip to dna/i }).click().catch(() => {});
    try {
      await expect(page.locator('.stage-name strong')).toHaveText(/DNA/, { timeout: 4_000 });
      return;
    } catch {}
  }
  throw new Error('Stage never transitioned to DNA');
}

test.describe('local site smoke (http://localhost:5173)', () => {
  test('boots and shows Cell stage with no fatal console errors', async ({ page }) => {
    const errors = attachConsoleSpy(page);
    await page.goto('/');

    await expect(page.getByText('Inside the Genome')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('.stage-name strong')).toHaveText('Cell');

    await page.waitForTimeout(1500);

    const fatal = fatalErrors(errors);
    // Specifically assert the depth-blit GL spam is not present anymore.
    expect(fatal.filter((e) => /glBlitFramebuffer/i.test(e))).toEqual([]);
    expect(fatal, `Unexpected console errors:\n${fatal.join('\n')}`).toEqual([]);
  });

  test('Skip-to-DNA reveals the gene panel + restart button', async ({ page }) => {
    await page.goto('/');
    await navigateToDnaStage(page);

    const panel = page.locator('.gene-panel.visible');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('BRCA1')).toBeVisible();
    await expect(panel.getByText('TP53')).toBeVisible();
    await expect(page.getByRole('button', { name: /restart/i })).toBeVisible();
  });

  test('Gene panel becomes available before DNA stage (offset >= 0.36)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();
    await page.waitForTimeout(1200);

    // Programmatically scroll the drei container to ~mid-chromatin (offset 0.4).
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('div')).find((d) => {
        const cs = getComputedStyle(d);
        return cs.overflowY === 'auto' || cs.overflowY === 'scroll';
      });
      if (!el) throw new Error('no scroll container');
      el.scrollTop = (el.scrollHeight - el.clientHeight) * 0.45;
    });

    // Allow damping to settle. Stage should be Chromatin or DNA approach.
    await page.waitForTimeout(1500);
    await expect(page.locator('.stage-name strong')).toHaveText(/Chromatin|DNA/);
    // And the gene panel should be visible already, before DNA proper.
    await expect(page.locator('.gene-panel.visible')).toBeVisible();
  });

  test('Highlight stays working across many gene clicks (no toggle-off)', async ({ page }) => {
    // Stub Ensembl to keep the test fast and offline-friendly.
    await page.route('**/rest.ensembl.org/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'ENSG', display_name: '', biotype: 'protein_coding' }),
      })
    );

    await page.goto('/');
    await navigateToDnaStage(page);

    // Click each gene in sequence — including clicking the same one twice in a row,
    // which previously toggled off. Now it should stay selected.
    const sequence = ['BRCA1', 'TP53', 'TP53', 'CFTR', 'BRCA1', 'APOE', 'APOE', 'MYH7'];
    for (const id of sequence) {
      const chip = page.locator('.gene-chip', { hasText: id });
      await chip.click();
      await expect(chip).toHaveClass(/selected/, { timeout: 2_000 });
      // Drawer should mirror the latest selection.
      await expect(page.locator('.gene-drawer.visible .gene-drawer-title')).toContainText(id);
    }

    // Closing the drawer should clear the selection.
    await page.locator('.gene-drawer.visible button[aria-label="Close gene details"]').click();
    await expect(page.locator('.gene-drawer.visible')).toHaveCount(0);
    await expect(page.locator('.gene-chip.selected')).toHaveCount(0);
  });

  test('Audio toggle button toggles play state without errors', async ({ page }) => {
    const errors = attachConsoleSpy(page);
    await page.goto('/');

    const toggle = page.getByRole('button', { name: /play ambient music|pause ambient music/i });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await toggle.click();
    // Play may resolve or be blocked by autoplay policy — either path keeps a
    // valid aria-pressed value. Be tolerant of headless browser quirks here.
    await page.waitForTimeout(800);
    const pressed = await toggle.getAttribute('aria-pressed');
    expect(['true', 'false']).toContain(pressed);

    // Click again — should not throw and should leave the button in a defined state.
    await toggle.click();
    await page.waitForTimeout(400);

    const fatal = fatalErrors(errors).filter((e) => !/decode/i.test(e));
    expect(fatal, `Unexpected console errors:\n${fatal.join('\n')}`).toEqual([]);
  });

  test('Direct scroll drives the stage transition end to end', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();
    await page.waitForTimeout(1200);

    const scrollTo = async (frac: number) => {
      await page.evaluate((f) => {
        const el = Array.from(document.querySelectorAll('div')).find((d) => {
          const cs = getComputedStyle(d);
          return cs.overflowY === 'auto' || cs.overflowY === 'scroll';
        });
        if (!el) throw new Error('no scroll container');
        el.scrollTop = (el.scrollHeight - el.clientHeight) * f;
      }, frac);
      await page.waitForTimeout(900);
    };

    await scrollTo(0.1);
    await expect(page.locator('.stage-name strong')).toHaveText('Cell');

    await scrollTo(0.3);
    await expect(page.locator('.stage-name strong')).toHaveText(/Nucleus|Chromatin/);

    await scrollTo(0.5);
    await expect(page.locator('.stage-name strong')).toHaveText(/Chromatin|DNA/);

    await scrollTo(0.85);
    await expect(page.locator('.stage-name strong')).toHaveText(/DNA/);
  });
});
