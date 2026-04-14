const form = document.getElementById("submit-form");
const output = document.getElementById("output");
const profileSelect = document.getElementById("profileSelect");
const saveProfileBtn = document.getElementById("saveProfile");

function setFormValues(values = {}) {
  form.querySelector("#profileId").value = values.id || "";
  form.querySelector("#submitUrl").value = values.submitUrl || "";
  form.querySelector("#imagePath").value = values.imagePath || "";
  form.querySelector("#linkUrl").value = values.linkUrl || "";
  form.querySelector("#templateText").value = values.templateText || "";
  form.querySelector("#checkboxLabels").value = values.checkboxLabels || "";
}

async function loadProfiles() {
  const response = await fetch("/api/profiles");
  const data = await response.json();
  const profiles = data.profiles || [];

  profileSelect.innerHTML = '<option value="">-- Select profile --</option>';

  for (const profile of profiles) {
    const opt = document.createElement("option");
    opt.value = profile.id;
    opt.textContent = `${profile.id} (${profile.submitUrl || "no url"})`;
    opt.dataset.profile = JSON.stringify(profile);
    profileSelect.appendChild(opt);
  }
}

profileSelect.addEventListener("change", () => {
  const selected = profileSelect.options[profileSelect.selectedIndex];
  if (!selected?.dataset.profile) {
    return;
  }

  const profile = JSON.parse(selected.dataset.profile);
  setFormValues(profile);
  output.textContent = `Loaded profile: ${profile.id}`;
});

saveProfileBtn.addEventListener("click", async () => {
  const profile = {
    id: form.querySelector("#profileId").value.trim(),
    submitUrl: form.querySelector("#submitUrl").value,
    imagePath: form.querySelector("#imagePath").value,
    linkUrl: form.querySelector("#linkUrl").value,
    templateText: form.querySelector("#templateText").value,
    checkboxLabels: form.querySelector("#checkboxLabels").value
  };

  const response = await fetch("/api/profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile)
  });

  const result = await response.json();
  if (!result.ok) {
    output.textContent = `Failed to save profile: ${result.message}`;
    return;
  }

  await loadProfiles();
  output.textContent = `Saved profile: ${result.profile.id}`;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    submitUrl: formData.get("submitUrl"),
    imagePath: formData.get("imagePath"),
    linkUrl: formData.get("linkUrl"),
    templateText: formData.get("templateText"),
    checkboxLabels: formData.get("checkboxLabels"),
    previewOnly: form.querySelector("#previewOnly").checked,
    headless: form.querySelector("#headless").checked
  };

  output.textContent = "Running...";

  const response = await fetch("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  const lines = [
    `ok: ${result.ok}`,
    ...(result.events || []),
    result.message ? `message: ${result.message}` : ""
  ].filter(Boolean);

  output.textContent = lines.join("\n");
});

loadProfiles();
