import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { promises as fs } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const profilesPath = path.join(__dirname, "..", "data", "profiles.json");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/profiles", async (_req, res) => {
  try {
    const raw = await fs.readFile(profilesPath, "utf8");
    const store = JSON.parse(raw || "{}");
    const profiles = Object.entries(store).map(([id, value]) => ({ id, ...value }));
    res.json({ ok: true, profiles });
  } catch {
    res.json({ ok: true, profiles: [] });
  }
});

app.post("/api/profiles", async (req, res) => {
  try {
    const body = req.body ?? {};
    const id = (body.id || body.submitUrl || "").trim();
    if (!id) return res.status(400).json({ ok: false, message: "id or submitUrl required" });

    let store = {};
    try { store = JSON.parse(await fs.readFile(profilesPath, "utf8") || "{}"); } catch {}
    store[id] = {
      submitUrl: body.submitUrl || "",
      checkboxLabels: body.checkboxLabels || "",
      templateText: body.templateText || "",
      linkUrl: body.linkUrl || "",
      imagePath: body.imagePath || ""
    };
    await fs.writeFile(profilesPath, JSON.stringify(store, null, 2));
    res.json({ ok: true, profile: { id, ...store[id] } });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.post("/api/submit", async (req, res) => {
  const {
    submitUrl, imagePath, linkUrl, templateText,
    checkboxLabels = "", previewOnly = true, headless = true
  } = req.body ?? {};

  if (!submitUrl || !linkUrl || !templateText) {
    return res.status(400).json({ ok: false, message: "submitUrl, linkUrl, templateText required" });
  }

  const browser = await chromium.launch({ headless: Boolean(headless) });
  const page = await browser.newPage();
  const events = [];

  try {
    await page.goto(submitUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    events.push("Opened submit page");

    const fileInput = page.locator('input[type="file"]');
    if (imagePath && await fileInput.count()) {
      await fileInput.first().setInputFiles(imagePath);
      events.push("Attached image");
    }

    const bodyContent = `${templateText}\n\n${linkUrl}`;
    const editor = page.locator('textarea, [contenteditable="true"]').first();
    if (await editor.count()) {
      const tag = await editor.evaluate(el => el.tagName.toLowerCase());
      if (tag === "textarea") await editor.fill(bodyContent);
      else { await editor.click(); await page.keyboard.type(bodyContent); }
      events.push("Filled content");
    }

    for (const lbl of checkboxLabels.split(",").map(s => s.trim()).filter(Boolean)) {
      const cb = page.getByLabel(lbl, { exact: false });
      if (await cb.count()) { await cb.first().check({ force: true }); }
    }

    if (previewOnly) {
      const shot = `preview-${Date.now()}.png`;
      await page.screenshot({ path: shot, fullPage: true });
      events.push(`Preview screenshot: ${shot}`);
      return res.json({ ok: true, events });
    }

    const submitBtn = page.getByRole("button", { name: /submit|post|send/i }).first();
    if (await submitBtn.count()) {
      await submitBtn.click();
      events.push("Clicked submit");
      return res.json({ ok: true, events });
    }

    return res.status(500).json({ ok: false, events: [...events, "Submit button not found"] });
  } catch (e) {
    return res.status(500).json({ ok: false, events: [...events, `Error: ${e.message}`] });
  } finally {
    await browser.close();
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Running on http://localhost:${port}`);
});
