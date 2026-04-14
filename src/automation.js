import { chromium } from "playwright";

function parseCsvList(raw = "") {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function checkRequiredBoxes(page, checkboxLabels) {
  const checked = [];

  for (const labelText of checkboxLabels) {
    const label = page.getByLabel(labelText, { exact: false });
    const count = await label.count();

    if (count > 0) {
      await label.first().check({ force: true });
      checked.push(labelText);
      continue;
    }

    const fallbackCheckbox = page.locator(`label:has-text("${labelText}") input[type="checkbox"]`);
    if ((await fallbackCheckbox.count()) > 0) {
      await fallbackCheckbox.first().check({ force: true });
      checked.push(labelText);
    }
  }

  return checked;
}

export async function submitTumblrPost(config) {
  const {
    submitUrl,
    imagePath,
    linkUrl,
    templateText,
    checkboxLabelsRaw,
    headless,
    timeoutMs,
    previewOnly
  } = config;

  const checkboxLabels = parseCsvList(checkboxLabelsRaw);
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  const events = [];

  try {
    await page.goto(submitUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    events.push("Opened submit page");

    const bodyContent = `${templateText}\n\n${linkUrl}`.trim();

    const fileInput = page.locator('input[type="file"]');
    if ((await fileInput.count()) > 0 && imagePath) {
      await fileInput.first().setInputFiles(imagePath);
      events.push("Attached image");
    } else {
      events.push("No file input found (or no image path provided)");
    }

    const editorCandidates = [
      'textarea[name*="body" i]',
      'textarea[name*="caption" i]',
      'textarea',
      '[contenteditable="true"]'
    ];

    let editorSet = false;
    for (const selector of editorCandidates) {
      const target = page.locator(selector);
      if ((await target.count()) === 0) {
        continue;
      }

      const first = target.first();
      const tagName = await first.evaluate((node) => node.tagName.toLowerCase());
      if (tagName === "textarea") {
        await first.fill(bodyContent);
      } else {
        await first.click();
        await page.keyboard.press("Control+A");
        await page.keyboard.type(bodyContent);
      }
      editorSet = true;
      events.push(`Filled post content via selector: ${selector}`);
      break;
    }

    if (!editorSet) {
      events.push("Warning: no post body editor detected");
    }

    const checked = await checkRequiredBoxes(page, checkboxLabels);
    if (checked.length) {
      events.push(`Checked boxes: ${checked.join(", ")}`);
    }

    if (previewOnly) {
      const shot = `preview-${Date.now()}.png`;
      await page.screenshot({ path: shot, fullPage: true });
      events.push(`Preview only mode: screenshot saved to ${shot}`);
      return { ok: true, events };
    }

    const submitButton = page
      .getByRole("button", { name: /submit|post|send/i })
      .first();

    if ((await submitButton.count()) > 0) {
      await submitButton.click();
      events.push("Clicked submit button");
    } else {
      events.push("Warning: submit button not found automatically");
      return { ok: false, events };
    }

    await page.waitForTimeout(1500);
    return { ok: true, events };
  } catch (error) {
    events.push(`Error: ${error.message}`);
    return { ok: false, events };
  } finally {
    await context.close();
    await browser.close();
  }
}
