import { test, expect, Page } from '@playwright/test';

function attachConsoleSpy(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/**
 * The canvas takes a variable amount of time to start its useFrame loop
 * (cold CDN, software WebGL). Click the skip button, then poll the stage
 * indicator — re-click every 2s if it hasn't transitioned yet.
 */
async function navigateToDnaStage(page: Page) {
  await page.goto('');
  await expect(page.locator('canvas')).toBeVisible();
  // Give R3F a beat to bind the scroll-to-offset listener.
  await page.waitForTimeout(1500);

  for (let attempt = 0; attempt < 6; attempt++) {
    await page.getByRole('button', { name: /skip to dna/i }).click().catch(() => {});
    try {
      await expect(page.locator('.stage-name strong')).toHaveText(/DNA/, { timeout: 4_000 });
      return;
    } catch {
      // re-fire — the listener may not have been registered on the first click
    }
  }
  throw new Error('Stage never transitioned to DNA after 6 attempts');
}

test.describe('deployed site (GitHub Pages)', () => {
  test('loads, renders canvas, defaults to Cell stage', async ({ page }) => {
    const errors = attachConsoleSpy(page);
    await page.goto('');

    await expect(page.getByText('Inside the Genome')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('.stage-name strong')).toHaveText('Cell');

    // Confirm the bundled JS — not /src/main.tsx — is loading.
    const scripts = await page.locator('script[type="module"]').evaluateAll((els) =>
      els.map((e) => (e as HTMLScriptElement).src)
    );
    expect(scripts.some((s) => /\/assets\/index-[\w-]+\.js$/.test(s))).toBe(true);

    await page.waitForTimeout(800);
    const fatal = errors.filter(
      (e) =>
        !/swiftshader/i.test(e) &&
        !/Slow software-emulated/i.test(e) &&
        !/THREE\.WebGL.*deprecated/i.test(e) &&
        !/Possible EventEmitter/i.test(e) &&
        !/rest\.ensembl\.org/i.test(e)
    );
    expect(fatal, `Unexpected console errors:\n${fatal.join('\n')}`).toEqual([]);
  });

  test('Skip-to-DNA reveals the gene panel and DNA stage', async ({ page }) => {
    await navigateToDnaStage(page);

    const panel = page.locator('.gene-panel.visible');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('BRCA1')).toBeVisible();
    await expect(panel.getByText('TP53')).toBeVisible();
    await expect(page.getByRole('button', { name: /restart/i })).toBeVisible();
  });

  test('Selecting a gene opens the drawer with curated content', async ({ page }) => {
    await navigateToDnaStage(page);

    await page.locator('.gene-chip', { hasText: 'TP53' }).click();
    const drawer = page.locator('.gene-drawer.visible');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('.gene-drawer-title')).toContainText('TP53');
    await expect(drawer).toContainText('Guardian of the genome');
    await expect(drawer).toContainText(/chr17/);

    // The Ensembl call against the real public API should resolve to ok or error;
    // either way the curated blurb is present (already asserted above).
    await expect(drawer.locator('.gene-drawer-status')).not.toHaveText('', { timeout: 12_000 });
  });
});
