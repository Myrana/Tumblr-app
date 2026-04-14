const form = document.getElementById("submit-form");
const output = document.getElementById("output");

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
