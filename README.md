# Tumblr Submit Assistant

A minimal local web app that automates Tumblr **Submit page** workflows for admin-review blogs.

## Features
- Enter a Tumblr submit URL.
- Provide a fixed template text block and jcink link.
- Optionally upload an image from local disk.
- Auto-check required checkboxes by label text.
- Run in **preview mode** (fills fields and captures screenshot without final submit).

## Install
```bash
npm install
npx playwright install chromium
```

## Run
```bash
npm start
```
Open `http://localhost:3000`.

## Safety
- Use this only where submissions are allowed.
- Do not bypass captchas or anti-bot measures.
- Keep submission rates low.
