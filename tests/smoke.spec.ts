import { test, expect, Page, ConsoleMessage } from '@playwright/test';

/**
 * Capture severe console messages so a single failure doesn't pollute later tests.
 * We deliberately tolerate warnings — three.js / R3F emit them in dev for software WebGL.
 */
function attachConsoleSpy(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test.describe('genomics 3D site smoke', () => {
  test('boots, shows brand + Cell stage, has a canvas', async ({ page }) => {
    const errors = attachConsoleSpy(page);
    await page.goto('/');

    await expect(page.getByText('Inside the Genome')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();

    // The stage indicator starts on Cell because scroll offset is 0.
    await expect(page.locator('.stage-name strong')).toHaveText('Cell');

    // Allow the renderer a beat to mount, then check we didn't trip page errors.
    await page.waitForTimeout(500);

    // Filter known-noisy warnings: three.js may log "WebGL: ... software" style errors
    // when running on swiftshader. Failing the test on those would just be CI flake.
    const fatal = errors.filter(
      (e) =>
        !/swiftshader/i.test(e) &&
        !/Slow software-emulated/i.test(e) &&
        !/THREE\.WebGL.*deprecated/i.test(e) &&
        !/Possible EventEmitter/i.test(e)
    );
    expect(fatal, `Unexpected console errors:\n${fatal.join('\n')}`).toEqual([]);
  });

  test('Skip-to-DNA advances the stage indicator and reveals the gene panel', async ({ page }) => {
    await page.goto('/');

    const skip = page.getByRole('button', { name: /skip to dna/i });
    await expect(skip).toBeVisible();
    await skip.click();

    // Stage label updates as scroll progresses (the rig damping takes a moment).
    await expect(page.locator('.stage-name strong')).toHaveText(/DNA/, { timeout: 8_000 });

    // Gene panel becomes interactive on DNA stage.
    const panel = page.locator('.gene-panel.visible');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('BRCA1')).toBeVisible();
    await expect(panel.getByText('TP53')).toBeVisible();

    // Restart button replaces the skip button once we're past 0.6.
    await expect(page.getByRole('button', { name: /restart/i })).toBeVisible();
  });

  test('Selecting a gene opens the detail drawer with the curated blurb', async ({ page }) => {
    // Stub the Ensembl call so the test is hermetic — we don't want flake from a
    // public REST endpoint, but we DO want the curated fallback path to render.
    await page.route('**/rest.ensembl.org/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ENSG00000012048',
          display_name: 'BRCA1',
          biotype: 'protein_coding',
          description: 'BRCA1 DNA repair associated [Source:HGNC Symbol;Acc:HGNC:1100]',
          assembly_name: 'GRCh38',
        }),
      });
    });

    await page.goto('/');
    await page.getByRole('button', { name: /skip to dna/i }).click();
    await expect(page.locator('.stage-name strong')).toHaveText(/DNA/);

    const brca1Chip = page.locator('.gene-chip', { hasText: 'BRCA1' });
    await brca1Chip.click();

    await expect(brca1Chip).toHaveClass(/selected/);

    const drawer = page.locator('.gene-drawer.visible');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('.gene-drawer-title')).toContainText('BRCA1');
    await expect(drawer).toContainText(/chr17/);
    // Curated blurb should always render, even alongside the Ensembl description.
    await expect(drawer).toContainText(/Loss-of-function variants/);

    // The mocked Ensembl description (citation tag stripped) should appear.
    await expect(drawer).toContainText(/BRCA1 DNA repair associated/);
    await expect(drawer.locator('.gene-drawer-status')).toContainText(/ensembl · live/i);

    // Closing the drawer hides it again.
    await drawer.getByRole('button', { name: /close gene details/i }).click();
    await expect(page.locator('.gene-drawer.visible')).toHaveCount(0);
  });

  test('Ensembl failure falls back to curated content', async ({ page }) => {
    await page.route('**/rest.ensembl.org/**', (route) => route.abort('failed'));

    await page.goto('/');
    await page.getByRole('button', { name: /skip to dna/i }).click();
    await expect(page.locator('.stage-name strong')).toHaveText(/DNA/);

    await page.locator('.gene-chip', { hasText: 'TP53' }).click();
    const drawer = page.locator('.gene-drawer.visible');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('.gene-drawer-status')).toContainText(/ensembl unavailable/i);
    await expect(drawer).toContainText(/Guardian of the genome/);
  });
});
