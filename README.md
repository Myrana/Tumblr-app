# Tumblr Submit Assistant

A local web app that automates Tumblr **Submit page** workflows for admin-review blogs.

## Features
- Enter a Tumblr submit URL.
- Provide a fixed template text block and jcink link.
- Optionally upload an image from local disk.
- Auto-check required checkboxes by label text.
- Save per-blog profiles (URL, text, link, image path, and checkbox rules).
- Run in **preview mode** (fills fields and captures screenshot without final submit).

## Local install
```bash
npm install
npx playwright install chromium
```

## Local run
```bash
npm start
```
Open `http://localhost:3000`.

## Quick test (recommended)
1. Start the app with `npm start`.
2. Open `http://localhost:3000`.
3. Fill:
   - **Blog profile name**: any label, e.g. `test-blog`
   - **Submit page URL**: your Tumblr submit URL, e.g. `https://BLOGNAME.tumblr.com/submit`
   - **JCINK link URL**: your ad thread link
   - **Template text block**: your reusable ad text
   - **Required checkbox labels**: comma-separated labels exactly as shown on that submit page
4. Keep **Preview only** checked.
5. Click **Save profile**.
6. Click **Run automation**.
7. Review the run log in the app and the generated `preview-*.png` screenshot in the project root.

## API smoke tests (optional)
Health endpoint:
```bash
curl http://localhost:3000/health
```

List profiles:
```bash
curl http://localhost:3000/api/profiles
```

Save profile:
```bash
curl -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "id":"test-blog",
    "submitUrl":"https://BLOGNAME.tumblr.com/submit",
    "checkboxLabels":"I agree, Mature content",
    "templateText":"Your ad text",
    "linkUrl":"https://example.jcink.net/...",
    "imagePath":"/absolute/path/to/image.png"
  }'
```

Run preview submit:
```bash
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{
    "submitUrl":"https://BLOGNAME.tumblr.com/submit",
    "linkUrl":"https://example.jcink.net/...",
    "templateText":"Your ad text",
    "checkboxLabels":"I agree, Mature content",
    "imagePath":"/absolute/path/to/image.png",
    "previewOnly":true,
    "headless":true
  }'
```

## Railway deployment (Docker)
This repo is prepared for Railway using the included `Dockerfile` + `railway.toml`.

1. Push this repo to GitHub.
2. In Railway, create a new project from that GitHub repo.
3. Railway will detect Docker build.
4. Set environment variables (if needed):
   - `PORT` (Railway sets this automatically at runtime).
5. Deploy.

### Health check
- `GET /health` returns `{ ok: true, service: "tumblr-submit-assistant" }`.

## Notes for production
- Keep `previewOnly` enabled while validating selectors per target blog.
- Tumblr submit forms vary by blog; checkbox labels/fields may need per-blog tuning.
- Do not bypass captchas or anti-bot protections.
