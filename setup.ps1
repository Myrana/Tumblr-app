# setup.ps1 (short version)

New-Item -ItemType Directory -Force src, public, data | Out-Null

@'
{
  "name": "tumblr-submit-assistant",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/server.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "playwright": "^1.54.0"
  }
}
'@ | Set-Content -Encoding UTF8 package.json

@'
{}
'@ | Set-Content -Encoding UTF8 data/profiles.json

@'
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
'@ | Set-Content -Encoding UTF8 src/server.js

@'
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tumblr Submit Assistant</title>
    <style>
      body { font-family: Arial; max-width: 760px; margin: 2rem auto; padding: 0 1rem; }
      input, textarea, select { width: 100%; margin: .4rem 0 1rem; padding: .6rem; box-sizing: border-box; }
      textarea { min-height: 120px; }
      button { padding: .6rem 1rem; margin-right: .5rem; }
      pre { background: #111; color: #0f0; padding: .8rem; min-height: 140px; }
    </style>
  </head>
  <body>
    <h1>Tumblr Submit Assistant</h1>
    <form id="form">
      <label>Profile name</label><input id="id" />
      <label>Saved profiles</label><select id="profile"><option value="">-- Select --</option></select>
      <label>Submit URL</label><input id="submitUrl" required />
      <label>Image path (optional)</label><input id="imagePath" />
      <label>JCINK link URL</label><input id="linkUrl" required />
      <label>Template text</label><textarea id="templateText" required></textarea>
      <label>Checkbox labels (comma-separated)</label><input id="checkboxLabels" />
      <label><input type="checkbox" id="previewOnly" checked /> Preview only</label>
      <label><input type="checkbox" id="headless" checked /> Headless</label><br/><br/>
      <button type="button" id="save">Save profile</button>
      <button type="submit">Run</button>
    </form>
    <h3>Output</h3>
    <pre id="out">Waiting...</pre>
    <script src="/app.js"></script>
  </body>
</html>
'@ | Set-Content -Encoding UTF8 public/index.html

@'
const out = document.getElementById("out");
const profile = document.getElementById("profile");

const getPayload = () => ({
  id: document.getElementById("id").value.trim(),
  submitUrl: document.getElementById("submitUrl").value,
  imagePath: document.getElementById("imagePath").value,
  linkUrl: document.getElementById("linkUrl").value,
  templateText: document.getElementById("templateText").value,
  checkboxLabels: document.getElementById("checkboxLabels").value,
  previewOnly: document.getElementById("previewOnly").checked,
  headless: document.getElementById("headless").checked
});

async function loadProfiles() {
  const r = await fetch("/api/profiles");
  const j = await r.json();
  profile.innerHTML = '<option value="">-- Select --</option>';
  for (const p of (j.profiles || [])) {
    const o = document.createElement("option");
    o.value = p.id;
    o.textContent = p.id;
    o.dataset.p = JSON.stringify(p);
    profile.appendChild(o);
  }
}

profile.addEventListener("change", () => {
  const o = profile.options[profile.selectedIndex];
  if (!o?.dataset?.p) return;
  const p = JSON.parse(o.dataset.p);
  document.getElementById("id").value = p.id || "";
  document.getElementById("submitUrl").value = p.submitUrl || "";
  document.getElementById("imagePath").value = p.imagePath || "";
  document.getElementById("linkUrl").value = p.linkUrl || "";
  document.getElementById("templateText").value = p.templateText || "";
  document.getElementById("checkboxLabels").value = p.checkboxLabels || "";
});

document.getElementById("save").addEventListener("click", async () => {
  const payload = getPayload();
  const r = await fetch("/api/profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const j = await r.json();
  out.textContent = JSON.stringify(j, null, 2);
  await loadProfiles();
});

document.getElementById("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = getPayload();
  const r = await fetch("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const j = await r.json();
  out.textContent = JSON.stringify(j, null, 2);
});

loadProfiles();
'@ | Set-Content -Encoding UTF8 public/app.js

Write-Host "Done creating files."