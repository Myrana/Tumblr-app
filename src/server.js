import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { submitTumblrPost } from "./automation.js";
import { listProfiles, saveProfile } from "./profileStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "tumblr-submit-assistant" });
});

app.get("/api/profiles", async (_req, res) => {
  const profiles = await listProfiles();
  res.status(200).json({ ok: true, profiles });
});

app.post("/api/profiles", async (req, res) => {
  try {
    const saved = await saveProfile(req.body ?? {});
    res.status(200).json({ ok: true, profile: saved });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

app.post("/api/submit", async (req, res) => {
  const {
    submitUrl,
    imagePath,
    linkUrl,
    templateText,
    checkboxLabels,
    previewOnly = true,
    headless = true,
    timeoutMs = 45000
  } = req.body ?? {};

  if (!submitUrl || !templateText || !linkUrl) {
    res.status(400).json({
      ok: false,
      message: "submitUrl, templateText, and linkUrl are required"
    });
    return;
  }

  const result = await submitTumblrPost({
    submitUrl,
    imagePath,
    linkUrl,
    templateText,
    checkboxLabelsRaw: checkboxLabels,
    headless: Boolean(headless),
    timeoutMs: Number(timeoutMs),
    previewOnly: Boolean(previewOnly)
  });

  res.status(result.ok ? 200 : 500).json(result);
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Tumblr Submit Assistant running on port ${port}`);
});
