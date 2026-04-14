import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { submitTumblrPost } from "./automation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

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

app.listen(port, () => {
  console.log(`Tumblr Submit Assistant running at http://localhost:${port}`);
});
