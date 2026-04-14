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
