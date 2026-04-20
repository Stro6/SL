# GitHub Pages Setup

## 1) Replace URL placeholder

Your GitHub Pages URL is:

- `https://stro6.github.io/SL`

Files that contain the token:

- `stromatic-media.html`
- `robots.txt`
- `sitemap.xml`

## 2) Publish from GitHub

1. Push the `project` folder contents to your repository root.
2. In GitHub: `Settings` -> `Pages`.
3. Set:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
4. Save and wait for deployment.

## 3) Verify

- Visit your site URL.
- Confirm these pages load:
  - `/`
  - `/about.html`
  - `/pricing.html`
  - `/blog.html`
  - `/privacy-policy.html`
- Confirm:
  - `/robots.txt`
  - `/sitemap.xml`

## 4) Submit to Google

1. Open Google Search Console.
2. Add URL-prefix property using your GitHub Pages URL.
3. Submit your sitemap URL:
   - `https://stro6.github.io/SL/sitemap.xml`
