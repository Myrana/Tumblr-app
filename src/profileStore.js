import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, "..", "data", "profiles.json");

async function ensureStore() {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify({}, null, 2));
  }
}

async function readStore() {
  await ensureStore();
  const content = await fs.readFile(DATA_PATH, "utf8");
  return JSON.parse(content || "{}");
}

async function writeStore(store) {
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2));
}

export async function listProfiles() {
  const store = await readStore();
  return Object.entries(store).map(([id, value]) => ({ id, ...value }));
}

export async function saveProfile(profile) {
  const store = await readStore();
  const id = profile.id?.trim() || profile.submitUrl?.trim();

  if (!id) {
    throw new Error("Profile id (or submitUrl) is required");
  }

  store[id] = {
    submitUrl: profile.submitUrl?.trim() || "",
    checkboxLabels: profile.checkboxLabels?.trim() || "",
    templateText: profile.templateText ?? "",
    linkUrl: profile.linkUrl?.trim() || "",
    imagePath: profile.imagePath?.trim() || ""
  };

  await writeStore(store);
  return { id, ...store[id] };
}
