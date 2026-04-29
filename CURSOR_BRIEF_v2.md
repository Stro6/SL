# Stromatic.tech — Remediation Brief v2

Hey Cursor. The site went live, I (Matt) had it audited end-to-end, and we found 23 issues across SEO, UX, legal, security, and conversion. This brief walks you through fixing all of them in priority order. Read the whole thing before starting; some later fixes depend on decisions made in earlier fixes.

> **Important framing for you, Cursor:** when in doubt, ASK. Don't invent content, don't fabricate testimonials, don't make up addresses or phone numbers, don't guess at form endpoints. If a fix requires information I haven't given you, stop and ask.

## What you have access to in this workspace

- The live website's GitHub repo (this is the project we're modifying)
- The mobile app's Expo project (reference only — do not modify)
- The `web-brief/` folder from v1 (still relevant for design tokens and architecture context)
- The `legal-bundle/` folder (the real Terms / Privacy / Refund docs that need to be deployed)
- This brief (`CURSOR_BRIEF_v2.md`)

## Build phases — execute in this order

There are five phases. **Do not skip ahead.** Each phase ends with you summarizing what you did, then waiting for my approval before starting the next phase. Don't bundle changes across phases — keep commits scoped.

---

## PHASE 1 — Critical fixes (must happen this week)

These fix things that are actively harmful or block all revenue. Do these in one batch.

### 1.1 — Remove fabricated portfolio section

**File:** `stromatic-media.html` (the main homepage content file)

**Problem:** The "Results that compound" section contains three case studies — Meridian Collective, Vaultline Systems, Huxley Magazine — that are not real. Publishing fabricated case studies violates the Canadian Competition Act §52 (false or misleading representations) and the FTC's endorsement guidelines, and it's a chargeback red flag for Stripe.

**What to do:**
- Find the entire `Portfolio` / `Results that compound` section
- Delete it entirely
- Replace with a much smaller placeholder block that reads exactly:

```html
<section id="work" class="work-placeholder">
  <div class="container">
    <p class="eyebrow">Case Studies</p>
    <h2>First case studies arriving Q3 2026.</h2>
    <p class="muted">
      We are currently onboarding our first cohort of partner brands.
      Verified results and engagement detail will be published here as
      retainers complete their first quarter. In the meantime, the
      methodology, scope, and pricing of every engagement is documented
      transparently across this site.
    </p>
  </div>
</section>
```

- Remove the "View full case library →" link at the bottom of that section.
- Remove the `Portfolio` link from the top nav menu (since there's nothing to navigate to).

**Why this exact copy:** it's honest ("we're new"), confident ("first cohort," "partner brands"), and turns the absence of social proof into a positioning statement instead of an apology. Don't soften it further. Don't add fake quotes. Don't add fake logos.

### 1.2 — Wire Stripe checkout to the four service pages

**Files affected:**
- `services/logo-pack.html`
- `services/seo-audit.html`
- `services/brand-kit.html`
- `services/mentor-1on1.html`
- New file: `assets/js/checkout.js`
- New file: `checkout/success.html`
- New file: `checkout/cancel.html`

**Problem:** Every service detail page currently says *"Checkout connects next — your brief is saved locally until Stripe is wired to this page."* This is on production. The site cannot take a single dollar.

**What to do:** Use the architecture from the v1 brief — call the existing Supabase Edge Function (`create-checkout`) that the mobile app already uses. The website is just another HTTP client to that same function.

**Step 1: Create `assets/js/checkout.js`** with this functionality (write the real version idiomatically — this is illustrative):

```javascript
(function () {
  'use strict';

  // Supabase config — both values are public-safe
  // (anon key is gated by RLS server-side).
  // Matt: replace these with your real Supabase project values.
  const SUPABASE_URL = window.STROMATIC_CONFIG?.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.STROMATIC_CONFIG?.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Stromatic: missing Supabase config. Check that the config <script> tag is loaded before checkout.js.');
  }

  // Strip control chars, trim, clamp.
  function clean(value, max) {
    if (typeof value !== 'string') return '';
    // eslint-disable-next-line no-control-regex
    return value.replace(/[\x00-\x08\x0B-\x1F\x7F]/g, '').trim().slice(0, max || 2000);
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
  }

  function isValidUrl(v) {
    try {
      const u = new URL(v);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (_) { return false; }
  }

  function showError(form, msg) {
    let box = form.querySelector('.form-error');
    if (!box) {
      box = document.createElement('div');
      box.className = 'form-error';
      box.setAttribute('role', 'alert');
      form.querySelector('button[type="submit"]').before(box);
    }
    box.textContent = msg;
    box.style.display = 'block';
  }

  function clearError(form) {
    const box = form.querySelector('.form-error');
    if (box) box.style.display = 'none';
  }

  function setLoading(button, loading) {
    if (loading) {
      button.dataset.label = button.textContent;
      button.textContent = 'Connecting to checkout…';
      button.disabled = true;
    } else {
      if (button.dataset.label) button.textContent = button.dataset.label;
      button.disabled = false;
    }
  }

  async function startCheckout(form) {
    const serviceId = form.dataset.serviceId;
    if (!serviceId) {
      showError(form, 'Configuration error — service ID missing.');
      return;
    }

    const formData = new FormData(form);
    const email = clean(formData.get('email') || '', 254).toLowerCase();

    if (!isValidEmail(email)) {
      showError(form, 'Please enter a valid email address.');
      return;
    }

    const brief = {};
    for (const [key, value] of formData.entries()) {
      if (key === 'email') continue;
      brief[key] = clean(value, 2000);
    }

    // URL fields require http(s)://
    const urlField = form.querySelector('input[type="url"]');
    if (urlField && urlField.value.trim() && !isValidUrl(urlField.value.trim())) {
      showError(form, urlField.previousElementSibling.textContent.replace(/\*$/, '').trim() + ' must start with http:// or https://');
      return;
    }

    clearError(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    setLoading(submitBtn, true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          serviceId,
          customerEmail: email,
          brief,
          returnUrl: `${window.location.origin}/checkout/success.html`,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Checkout failed (${res.status})`);
      if (!data.checkoutUrl) throw new Error('No checkout URL returned');

      window.location.href = data.checkoutUrl;
    } catch (err) {
      showError(form, err.message || 'Could not start checkout. Please try again.');
      setLoading(submitBtn, false);
    }
  }

  // Wire up any form with .checkout-form class on the page.
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('form.checkout-form').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        startCheckout(form);
      });
    });
  });
})();
```

**Step 2: Update each service detail page's `<form>` element.**

For each of the four service pages, find the existing brief form and:
- Add `class="checkout-form"`
- Add `data-service-id="logo-pack"` (or `seo-audit`, `brand-kit`, `mentor-1on1` as appropriate)
- Add an email field as the FIRST input, before any service-specific fields:
  ```html
  <label for="email">Email <span aria-label="required">*</span></label>
  <input type="email" id="email" name="email" required maxlength="254"
         placeholder="you@yourdomain.com" autocomplete="email">
  ```
- Add `required` and appropriate `maxlength`/`pattern` attributes to existing fields per the schemas in v1's `SERVICES_DATA.md` (logo-pack: businessName/industry/vibe required, max 80; seo-audit: websiteUrl/primaryGoal required; brand-kit: businessName/industry/audience/vibe required; mentor-1on1: specialist/accounts/wantedOutcome/timezone required)
- Replace the placeholder "Checkout connects next…" text below the submit button with:
  ```html
  <p class="form-disclaimer">
    You'll be redirected to Stripe to complete payment. Your work is delivered to the email above within the listed turnaround.
    <a href="/refund-policy.html">All sales are final — see refund policy.</a>
  </p>
  ```

**Step 3: Add the config script tag to the `<head>` of each service page** (and the success/cancel pages):

```html
<script>
  window.STROMATIC_CONFIG = {
    SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
    SUPABASE_ANON_KEY: 'eyJ...your-anon-key'
  };
</script>
<script src="/assets/js/checkout.js" defer></script>
```

Tell Matt where to fill in the real values. **Do not invent or hardcode dummy values that look real** — leave them as obvious placeholders.

**Step 4: Create `checkout/success.html`** — a clean confirmation page using the same site styles. Copy:
> **Eyebrow:** PAYMENT CONFIRMED
> **Headline:** You're all set.
> **Body:** We've received your brief and will deliver the finished work to your inbox within the listed turnaround. Keep an eye on your spam folder just in case. A receipt is on its way from Stripe.
> **CTA:** Back to home → `/`

**Step 5: Create `checkout/cancel.html`** — friendly recovery page.
> **Eyebrow:** CHECKOUT CANCELLED
> **Headline:** No charge made.
> **Body:** Your brief is saved on this device — you can come back to it anytime. If something went wrong with checkout, please email stromaticmedia@stromatic.tech and we'll sort it.
> **CTAs:** Browse services → `/services/` ; Back to home → `/`

**Step 6: Add a small CSS rule** for `.form-error` and `.form-disclaimer`:

```css
.form-error {
  display: none;
  background: rgba(255, 107, 157, 0.10);
  border: 1px solid rgba(255, 107, 157, 0.40);
  color: var(--color-danger, #FF6B9D);
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 16px;
  font-size: 14px;
}
.form-disclaimer {
  font-size: 13px;
  color: var(--color-text-dim, #8B7AA8);
  margin-top: 12px;
  line-height: 1.5;
}
.form-disclaimer a {
  color: inherit;
  text-decoration: underline;
}
```

### 1.3 — Deploy the real legal documents

**Files:** `privacy-policy.html`, `terms-of-service.html`, new file `refund-policy.html`

**Problem:** The current legal pages are 2-sentence stubs. The real long-form documents exist in the `legal-bundle/` folder but were never deployed. Stripe will side with cardholders in disputes when there's no published refund policy. PIPEDA and GDPR both require specific disclosures the stub doesn't make.

**What to do:**

**Step 1:** Open `legal-bundle/TERMS.md`, `legal-bundle/PRIVACY.md`, `legal-bundle/REFUND.md` (these are the markdown files Matt got from the earlier session).

**Step 2:** Convert each markdown file to a clean HTML page using the existing site's design language. Don't reinvent the wheel — match the typographic style of the existing pages. Headings get the existing heading classes, body copy gets body styles, etc.

**Step 3:** Each page should have:
- The same site header and footer as the rest of the site
- A single column of readable prose, max-width about 720px for readability
- All `##` markdown headings as `<h2>`, `###` as `<h3>`, etc.
- Blockquotes (`> ...`) rendered with a left border accent
- Bold, italic, and inline code rendered correctly
- A "Back to home" link at the bottom
- The same `<title>` and meta description format as other pages

**Step 4:** Deploy at:
- `/privacy-policy.html` (overwrite existing stub)
- `/terms-of-service.html` (overwrite existing stub)
- `/refund-policy.html` (new file)

**Step 5:** Update the footer of EVERY page on the site to link all three. Currently the footer links Privacy and Terms. Add Refunds:

```html
<nav class="legal-links" aria-label="Legal">
  <a href="/privacy-policy.html">Privacy Policy</a>
  <a href="/terms-of-service.html">Terms of Service</a>
  <a href="/refund-policy.html">Refund Policy</a>
</nav>
```

**Step 6:** Delete `cookie-policy.html` and remove its footer link entirely. We don't need a cookie policy until we add tracking cookies. If/when we add Plausible (which is cookieless), we still don't need one. If we ever add Google Analytics, we'll write a proper one then.

### 1.4 — Fix the homepage redirect

**Problem:** `stromatic.tech/` currently shows "Redirecting to..." and forwards to `stromatic-media.html`. This dilutes SEO signal, looks unprofessional, and adds a round-trip to every visit.

**What to do:**
- Take the full content of `stromatic-media.html` and move it into `index.html` (overwrite the existing redirect-only `index.html`)
- Delete `stromatic-media.html` entirely
- Add 301 redirects from `stromatic-media.html` → `/` so any backlinks pointing to the old URL still work. On GitHub Pages, this means creating a `stromatic-media.html` that's a single-line meta refresh to `/` (acceptable workaround since GitHub Pages can't do server-side 301s):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Redirecting…</title>
  <link rel="canonical" href="https://stromatic.tech/">
  <meta http-equiv="refresh" content="0; url=/">
  <meta name="robots" content="noindex">
</head>
<body><script>location.replace('/');</script></body>
</html>
```

- Search-and-replace every internal link in the project: `stromatic-media.html` → `/` (or `/#approach`, `/#services`, etc. for the anchor links)
- Verify `stromatic.tech/` now serves the real homepage immediately

### 1.5 — Decide and apply the agency-vs-storefront positioning

**Problem:** The site currently presents two completely different businesses: a high-touch B2B agency on the homepage, and a $40-$200 self-serve storefront under `/services/`. These have different audiences, sales cycles, and trust signals. Visitors are confused; signal is split.

**Matt's decision (from previous conversation):** The website's primary focus is the productized self-serve services. The B2B agency framing was aspirational and not backed by real case studies.

**What to do:**

The new homepage hierarchy should be: **services-first, with custom engagements as a small secondary mention.** Specifically:

**Step 1:** Rewrite the hero of `index.html`:

- **Eyebrow:** STUDIO QUALITY · FIXED PRICING
- **Headline:** Skip the agency.<br>Keep the polish.
- **Subhead:** Studio-grade brand and growth work, delivered in 24 hours. Pick a service, share your brief, and we handle the rest — no retainers, no calls, no sales theater.
- **Primary CTA:** "Browse services" → `/services/`
- **Secondary CTA:** "How it works" → `#approach` anchor

**Step 2:** Restructure the page sections in this order:
1. Hero (above)
2. **NEW: Services preview section** — pull the four service cards from `/services/` and show them on the homepage too, so the value prop is immediate. Each card links to its detail page.
3. "How it works" (rename from "Approach"; simplify the four-step methodology — keep it but make it about productized service delivery, not bespoke engagements)
4. **(deleted: portfolio)** — replaced by the placeholder from 1.1
5. **NEW: Custom engagements section** — small section saying:
   > **Need something custom?** For brands beyond the productized scope — full retainer engagements, performance ad operations, ongoing infrastructure work — we take a small number of custom partnerships per quarter. Email stromaticmedia@gmail.com to discuss.
6. FAQ (keep, but rewrite Q1 to mention productized services)
7. Contact form (keep — but see 1.6 for what to do with submissions)
8. Newsletter (keep — but see 2.6)
9. Footer

**Step 3:** Update the FAQ section. Replace the existing 3 questions with these 5:

- **What does Stromatic Media do?** We deliver fixed-price brand and growth work — logo packs, SEO audits, brand kits, and 1:1 mentor sessions — with 24-hour turnarounds. For bigger engagements, we take on a small number of custom partnerships each quarter.
- **How fast is delivery?** Productized services ship within the timeframe shown on each service page (typically 24 hours). Mentor calls are scheduled within 3-5 business days.
- **What happens after I pay?** You get a confirmation email, and the finished work arrives in your inbox within the stated turnaround. A Stripe receipt arrives separately.
- **Where are you based?** Toronto, Ontario, Canada. We work with brands worldwide.
- **Do you offer refunds?** All sales are final once a brief is submitted — see our [refund policy](/refund-policy.html) for the full terms and limited exceptions.

**Step 4:** Remove the marquee/scrolling text bar of "Performance Advertising · Brand Infrastructure · Dynamic Content..." — it leaned hard into the agency framing, doesn't fit the new direction, and has accessibility issues (see 4.10).

**Step 5:** Tone shift. The original site used phrases like "growth infrastructure," "connective tissue," "compounding returns." For the storefront audience these read as overwrought. Rewrite headings and intro paragraphs in plainer language. Examples:
- "We build the connective tissue" → "Less talk. More work shipped."
- "The brands winning attention aren't louder — they're better architected" → cut entirely
- "We engineer growth infrastructure" → "We do the work most agencies overcharge for"

Don't dumb it down — keep it confident — just remove the jargon. When in doubt, read it aloud; if it sounds like a McKinsey deck, rewrite it.

### 1.6 — Verify the contact form actually delivers

**Problem:** I (Claude) couldn't determine where the existing contact form posts. If it's broken or going to a non-monitored inbox, leads are being lost.

**What to do:**

**Step 1:** Inspect the existing form's current submission target. Tell Matt what you find. Three possibilities:
- It's wired to a service (Formspree, Netlify Forms, etc.) — verify it works.
- It's wired but going somewhere wrong — fix the destination.
- It's not wired at all — wire it now.

**Step 2:** If it's not wired, the simplest reliable option is to add a new Supabase Edge Function called `submit-contact` that mirrors `create-checkout` in structure (rate-limited, validated, sanitized), inserts into a new `contact_requests` table, and emails Matt at `stromaticmedia@gmail.com` via Resend. Tell Matt before building this — it's a meaningful chunk of work and we want to confirm Supabase is the right home for this.

**Alternative simpler option:** use Formspree's free tier (50 submissions/month). Add `action="https://formspree.io/f/YOUR_FORM_ID"` and `method="POST"`. Tell Matt to set up the Formspree account and give you the form ID.

**Either way:** add a honeypot field to the form to defeat basic spam:
```html
<input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off">
```

Submissions where `_gotcha` is non-empty should be silently dropped (server side; if you go the Formspree route, Formspree handles this automatically when the field is named `_gotcha`).

### 1.7 — Test the contact and brief forms end-to-end

After 1.2 and 1.6, manually walk through:
- Submit a fake audit request from the homepage form. Verify Matt receives it.
- Submit a fake order on each of the four service pages with Stripe test card `4242 4242 4242 4242`. Verify the Stripe Checkout page loads with the right price.
- Click "Cancel" on Stripe Checkout — verify return to `/checkout/cancel.html`.
- Complete a test order — verify return to `/checkout/success.html` and that Matt receives both the customer-confirmation email and the admin notification.

If any step fails, fix it before moving to Phase 2.

### Phase 1 deliverable

Reply to Matt with:
- A bullet list of files created/modified
- The exact placeholder values that need real config (Supabase URL, anon key, Stripe webhook target, Formspree form ID)
- Any open questions
- Confirmation that the test flow worked end-to-end

Then **stop and wait** before proceeding to Phase 2.

---

## PHASE 2 — SEO foundations

These won't drive traffic next week — SEO compounds slowly — but the site is currently invisible to Google because of fixable basics. Skipping these means you're building a paid-ads-only business by default.

### 2.1 — Create `robots.txt`

**File:** `/robots.txt` (project root)

```
User-agent: *
Allow: /

Sitemap: https://stromatic.tech/sitemap.xml
```

That's it. Don't disallow anything; everything we have is meant to be indexed.

### 2.2 — Create `sitemap.xml`

**File:** `/sitemap.xml` (project root)

Auto-generate from the actual list of HTML files. The format:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://stromatic.tech/</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://stromatic.tech/services/</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://stromatic.tech/services/logo-pack.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- ...same pattern for seo-audit, brand-kit, mentor-1on1... -->
  <url>
    <loc>https://stromatic.tech/privacy-policy.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <!-- ...similar for terms-of-service.html, refund-policy.html... -->
</urlset>
```

Skip pages we're killing (cookie-policy.html, stromatic-media.html). Don't include /checkout/* — those aren't useful in search results.

### 2.3 — Add meta tags to every page

**Every HTML page must have inside `<head>`:**

```html
<title>[Specific page title] | Stromatic Media</title>
<meta name="description" content="[Unique 140-160 char description specific to this page. No filler.]">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="canonical" href="https://stromatic.tech/[page-path]">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://stromatic.tech/[page-path]">
<meta property="og:title" content="[Page title]">
<meta property="og:description" content="[Same as meta description]">
<meta property="og:image" content="https://stromatic.tech/assets/img/og-default.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="Stromatic Media">
<meta property="og:locale" content="en_CA">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="[Page title]">
<meta name="twitter:description" content="[Same as meta description]">
<meta name="twitter:image" content="https://stromatic.tech/assets/img/og-default.png">
```

**Per-page descriptions** (use these verbatim):

- **Homepage (`/`):** Studio-quality brand and growth work for founders. Fixed prices, 24-hour turnarounds, no sales calls. Logo packs, SEO audits, brand kits, mentor sessions.
- **Services index (`/services/`):** Pick what you need. Logo packs, SEO audits, brand kits, and 1:1 mentor calls — fixed pricing, 24-hour turnaround, one brief per checkout.
- **Logo Pack (`/services/logo-pack.html`):** Four distinct logo directions tailored to your brand, delivered in 24 hours with transparent backgrounds and ready-to-ship file formats. $99.99.
- **SEO Audit (`/services/seo-audit.html`):** A surgical look at why traffic stalls. Full technical and content audit, prioritized fixes, delivered as a polished PDF report. $199.99.
- **Brand Kit (`/services/brand-kit.html`):** A complete brand foundation: voice, palette, typography, and usage guidelines documented as a single PDF guide. $149.99.
- **Mentor Call (`/services/mentor-1on1.html`):** 30 minutes with a matched specialist — social, paid media, YouTube, or growth strategy. Bring URLs and goals, leave with answers. $40.
- **Privacy / Terms / Refund pages:** Use generic but specific descriptions like "Privacy policy for Stromatic Media — what we collect, how we use it, your rights, and how to contact us."

**Image asset:** Generate a default Open Graph image at `assets/img/og-default.png`, 1200×630, with the bubble S logo on the lavender gradient background and the wordmark "STROMATIC MEDIA" centered. Matt has the source images in the app's `assets/` folder. If you can compose this, do; if not, ask Matt to provide one.

### 2.4 — Add `LocalBusiness` JSON-LD schema

**File:** `index.html` only (homepage)

Add inside `<head>`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "name": "Stromatic Media",
  "description": "Studio-quality brand and growth work delivered with fixed prices and 24-hour turnarounds.",
  "url": "https://stromatic.tech",
  "email": "stromaticmedia@gmail.com",
  "image": "https://stromatic.tech/assets/img/og-default.png",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Toronto",
    "addressRegion": "ON",
    "addressCountry": "CA"
  },
  "areaServed": "Worldwide",
  "priceRange": "$40 - $199.99",
  "sameAs": []
}
</script>
```

When Matt creates social profiles, he updates the `sameAs` array with their URLs. Leave it empty for now.

### 2.5 — Create a real `404.html`

**File:** `/404.html`

GitHub Pages automatically serves this for any unknown path. Create one with the site's normal header/footer and:

- **Headline:** This page took a wrong turn.
- **Body:** The page you're looking for doesn't exist or was moved. Here are the most common destinations:
- **Links:** Home, Browse services, Contact

Keep it on-brand. Do not use "404" as the heading; use the human copy. The status code is automatically set by the server.

### 2.6 — Newsletter signup — fix or remove

**Problem:** The "Subscribe" button on the homepage newsletter section appears to go nowhere. This is collecting (or attempting to collect) personal data with no system to honor it.

**Two options, ask Matt which:**

**Option A (recommended for now):** Remove the entire newsletter section. We don't have a content cadence to feed a monthly newsletter, and a dead signup form hurts more than it helps.

**Option B:** Wire it to Resend audiences (Resend supports basic broadcast lists) or Buttondown ($9/mo, simpler than Mailchimp). If Matt picks this, ask which provider he wants and wait for credentials.

Default to A unless Matt says otherwise.

### Phase 2 deliverable

Show Matt the new pages and have him submit `https://stromatic.tech/sitemap.xml` to Google Search Console. Search Console setup is a 15-minute thing Matt does himself — give him these instructions:

1. Go to https://search.google.com/search-console
2. Add property → Domain → enter `stromatic.tech`
3. Verify by adding a TXT record to DNS (instructions on the page)
4. Once verified, Sitemaps → submit `https://stromatic.tech/sitemap.xml`
5. Coverage will populate over the next 1-2 weeks

---

## PHASE 3 — Trust, polish, and conversion

Site has working checkout and is discoverable. Now make it feel professional and convert better.

### 3.1 — Set up custom email domain

**Matt task, not Cursor task — give Matt the steps:**

1. Sign up for Google Workspace Business Starter ($7.20 CAD/user/month)
2. Verify ownership of `stromatic.tech` via DNS TXT record
3. Set up MX records for Gmail (Google provides these)
4. Create primary address `you@stromatic.tech` (Matt picks the local part — `matt@`, `hello@`, `team@`, etc.)
5. Set up forwarding from old Gmail to new address during transition

**After Matt does this**, Cursor: search-and-replace every instance of `stromaticmedia@gmail.com` on the website with the new address. Keep one `stromaticmedia@gmail.com` reference: in the legal docs only — the legal docs were drafted with that contact and it's safer to keep it there or update everywhere if the new address is preferred.

### 3.2 — Add Plausible Analytics

**Why Plausible over Google Analytics:**
- Privacy-friendly by default, no cookie banner needed (PIPEDA/GDPR compliant out of the box)
- 1KB script, doesn't slow page load
- Single dashboard, no setup wizards
- $9/month — cheap insurance against flying blind

**What to do:**

**Matt task:** Sign up at plausible.io, add `stromatic.tech` as a site, get the embed snippet.

**Cursor task:** Add the Plausible snippet to the `<head>` of every page:

```html
<script defer data-domain="stromatic.tech" src="https://plausible.io/js/script.js"></script>
```

**Plus** add custom event tracking on:
- Service detail page submit button: `event=Checkout Started, props={service: 'logo-pack'}`
- Contact form submit: `event=Contact Submitted`
- Newsletter signup (if kept): `event=Newsletter Signup`

The Plausible snippet for custom events:
```html
<script>
window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments) }
</script>
```
Then call `plausible('Checkout Started', { props: { service: 'logo-pack' }})` in the appropriate handlers in `checkout.js`.

### 3.3 — Add a favicon

**Matt task:** Provide a 512×512 version of the bubble S logo (the app's `sm_app_trans.png` — it's already in the app project Cursor can reference).

**Cursor task:**
1. Generate a multi-resolution `favicon.ico` (16×16, 32×32, 48×48 embedded) from the source PNG. If Cursor can't do this directly, give Matt instructions: use `realfavicongenerator.net`, upload the source, download the generated bundle.
2. Add the bundle to `/assets/img/favicons/` and reference in every page's `<head>`:

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/assets/img/favicons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/favicons/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
```

Also add a `/site.webmanifest`:
```json
{
  "name": "Stromatic Media",
  "short_name": "Stromatic",
  "icons": [
    { "src": "/assets/img/favicons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/img/favicons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#0F0420",
  "background_color": "#0F0420",
  "display": "standalone"
}
```

### 3.4 — Mobile responsiveness audit

**What to do:**

Open the live site on three viewport widths using browser dev tools:
- 375px (iPhone SE / 13 mini)
- 768px (iPad portrait)
- 1440px (desktop)

For each, walk through:
1. Homepage hero
2. Services catalog
3. Each service detail page (with the brief form expanded)
4. Each legal page
5. Contact form (with on-screen keyboard simulated up — this is a common mobile bug spot)
6. Footer

Flag and fix:
- Text below 14px on mobile
- Tap targets smaller than 44×44px
- Text contrast under WCAG AA (use a contrast checker on key combos)
- Horizontal scrolling on any page (always a bug)
- Form fields too narrow to read placeholder text
- Buttons that don't reach a usable size on touch
- Sticky header eating screen real estate on small viewports

Report findings to Matt before fixing anything visually significant — some "issues" are intentional design decisions.

### 3.5 — Soften "Within 1 business day, guaranteed"

**File:** `index.html`, contact section

**Change:** "Within 1 business day, guaranteed" → "We aim to respond within 1 business day."

Removes a tiny written-guarantee liability with zero conversion impact.

### 3.6 — Trim duplicate CTAs

**File:** `index.html`

**Problem:** The page has 4-5 "Get an Audit / Free Audit / Request my Audit" CTAs. By the third repetition, it muddies the call-to-action hierarchy.

**Keep:**
- Top nav: "Get an Audit" (or rename to "Browse services" given the new positioning)
- Hero: primary CTA "Browse services"
- One bottom CTA at the end of the page

**Remove:**
- The "Free · No sales call · No commitment / Start with a free audit / Request My Audit" middle banner section. Delete it. It interrupts flow without adding info.

### 3.7 — Image optimization

**What to do:**

For every image in `assets/img/`:
- If JPEG/PNG and over 100KB, convert to WebP and replace
- Add explicit `width` and `height` attributes to every `<img>` tag (prevents cumulative layout shift)
- Add `loading="lazy"` to all images below the fold
- Add `alt=""` (empty for decorative images) or descriptive alt text (for content images)

The lavender wordmark and bubble logo files are large source PNGs — they should be served as WebP at appropriate sizes.

### 3.8 — Fix `http://` vs `https://` mixed links

**What to do:**

Search across all HTML files for `http://stromatic.tech` and replace with `https://stromatic.tech`. Ditto for any `http://` external links that should be `https://` (essentially all modern sites). One commit, done.

### 3.9 — Verify `<html lang="en">` on every page

**What to do:**

Every HTML page's opening tag must be `<html lang="en">`. This helps screen readers announce text correctly and helps Google determine page language. Audit all pages and fix any missing.

### Phase 3 deliverable

Run a Lighthouse audit (Chrome DevTools → Lighthouse tab) on the homepage and on `/services/logo-pack.html`. Target scores:
- Performance: 85+ on mobile, 95+ on desktop
- Accessibility: 95+
- Best Practices: 95+
- SEO: 95+

Report scores to Matt with screenshots. If any score falls short, list what's dragging it down.

---

## PHASE 4 — Pre-launch hardening

Before Matt switches Stripe to live mode and runs ads.

### 4.1 — Verify Resend domain

**Matt task with Cursor support:**

1. In Resend dashboard → Domains → Add Domain → `stromatic.tech`
2. Resend gives you DNS records (typically: 1 SPF, 3 DKIM, 1 DMARC).
3. Add them all in the DNS provider that controls `stromatic.tech` (likely whoever Matt bought the domain from — Namecheap, Cloudflare, Google Domains, etc.)
4. Wait 15-60 minutes for propagation, click "Verify" in Resend.
5. Once verified, update the `EMAIL_FROM` secret in Supabase to use the new sending address (e.g., `Stromatic Media <orders@stromatic.tech>`).

This is critical before launching. Without domain verification, customer confirmations land in spam ~50% of the time, generating chargebacks.

### 4.2 — Verify Stripe live mode setup

**Matt task:**
1. In Stripe Dashboard, click "Activate account" (top of dashboard).
2. Provide: legal name, address, SIN or BN if applicable, Canadian bank for payouts.
3. Stripe will ask for verification documents (driver's license usually). Upload immediately.
4. First payouts hold for ~7 days — plan around this; do not launch ads until you've successfully done a $1 test charge in live mode and confirmed the money lands in your bank.

**Cursor task once Matt confirms live mode:**
1. Update the `STRIPE_SECRET_KEY` Supabase secret from `sk_test_...` to `sk_live_...`.
2. Update the `STRIPE_WEBHOOK_SECRET` to the live-mode webhook secret (Stripe gives a different one for live mode).
3. Recreate the webhook endpoint in Stripe Dashboard's live mode pointing at the same Supabase function URL.
4. Redeploy the Supabase Edge Function for the new secrets to take effect.

### 4.3 — Send yourself a $1 live test order

**Matt task:**

After 4.1 and 4.2 are done:
1. Use a real card for a real $1 test (you can refund yourself in 1 click after).
2. Verify: confirmation email arrives, admin email arrives, `orders` table in Supabase shows the row with `status: 'paid'`, money lands in bank within payout schedule.
3. Refund yourself in Stripe to clean up.

If any step breaks, fix before any customer touches the site.

### 4.4 — Content security policy header

**File:** `_headers` (Cloudflare Pages) or via `<meta>` tag (GitHub Pages workaround)

Add to every page's `<head>`:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://plausible.io https://js.stripe.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co https://plausible.io;
  frame-src https://js.stripe.com https://hooks.stripe.com;
  form-action 'self' https://checkout.stripe.com;
">
```

This significantly reduces XSS risk. Test thoroughly after adding — CSPs break things if a domain gets missed. Watch the browser console for `Refused to load…` errors.

### 4.5 — Secret scan one more time

**What to do:**

Run a manual grep over every HTML, JS, and config file in the repo:

```bash
grep -rEn 'sk_(live|test)_[A-Za-z0-9]{10,}|whsec_[A-Za-z0-9]{10,}|re_[A-Za-z0-9]{20,}' .
```

The only acceptable hits are:
- The placeholder values in the inline config (`'eyJ...your-anon-key'`-style obvious placeholders)
- Documentation referencing the format

Any real secret that snuck in must be rotated immediately (in Stripe / Resend / Supabase dashboards) and removed from the repo. **Don't just delete the file — rotate the secret first.** Once a secret is committed, it's compromised even if you delete the file in a later commit.

### Phase 4 deliverable

Confirm to Matt:
- All four "Matt tasks" are done
- A successful $1 live test was completed and refunded
- CSP header is in place
- Secret scan came back clean

---

## PHASE 5 — Ongoing / nice-to-haves

These don't block launch. Do them as time permits over the following weeks.

### 5.1 — Flesh out About / Pricing / Blog or remove

**Two options:**

**Option A (recommended):** Remove these pages and footer links. They're "coming soon" placeholders that hurt more than help. Once we have real content, restore them.

**Option B:** Write 200-400 word real pages. Pricing in particular could become a useful page if it cleanly explains "why fixed prices, why no retainers" — that's a positioning asset.

If Matt wants Option B, write rough drafts, get his approval, then publish.

### 5.2 — Newsletter integration (if kept)

If Matt kept the newsletter, integrate it with Resend audiences or Buttondown. Otherwise, this is closed.

### 5.3 — First case study

After 3 paying customers, ask one for permission to write up the engagement publicly. Replace the "Q3 2026" placeholder with the real case study. This is a future task — don't act on it now.

### 5.4 — Dynamic OG image generation

Some sites generate per-page OG images dynamically (different image for each service, different image for each blog post). Vercel's `@vercel/og` is the easiest path, or Cloudflare Workers. Skip for now — the single default OG image is fine for v1.

### 5.5 — Add structured FAQ JSON-LD

Once the FAQ section is settled (after 1.5), add `FAQPage` schema to make Google show those Q&As as rich results in search. Format:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What does Stromatic Media do?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We deliver fixed-price brand and growth work — logo packs, SEO audits, brand kits, and 1:1 mentor sessions — with 24-hour turnarounds."
      }
    },
    // ...rest of FAQs
  ]
}
</script>
```

### 5.6 — Service-specific OG images

Eventually, each service detail page should have its own OG image showing the price prominently. Matt or a designer can produce these in batch — they're just static PNGs.

### 5.7 — Sitemap auto-update

Long-term, the sitemap should regenerate when pages are added. For a static site this small, manual updates are fine; reconsider when there are 20+ pages.

---

## What you (Cursor) should NOT do without asking

- Add tracking pixels (Meta Pixel, TikTok Pixel, etc.) — Matt may want these for ads, but get explicit approval first
- Add a chat widget (Intercom, Crisp, etc.) — Matt has not asked for this
- Add a popup / modal / "exit intent" overlay — these are universally hated and conversion-negative for B2B
- Change the brand color palette
- Reword the legal docs — they were drafted carefully and reviewed; only pour them into HTML, don't paraphrase
- Add testimonials, case studies, client logos, or any social-proof element that isn't real
- Create new pages that aren't in this brief
- Add `package.json` / `npm install` / build steps — the site stays as plain HTML/CSS/JS
- Switch hosting providers — GitHub Pages with the existing CNAME is fine

---

## Communication protocol

After each phase, reply to Matt with:
1. **Files changed:** bulleted list with one-line summary each
2. **Files created:** same
3. **Files deleted:** same
4. **Open questions:** anything that blocked you or where you needed to make a judgment call
5. **What you tested:** specific URLs and what you saw work
6. **What needs Matt's input next:** the bottleneck items he must do himself (Resend DNS, Stripe verification, etc.)

Keep your replies tight. No marketing-speak. No "I'd be happy to help with…" filler.

---

## One last thing

This brief is comprehensive on purpose — it covers a lot of ground because the audit found a lot of issues. **Don't try to do all five phases in one session.** Phase 1 alone is a solid afternoon's work. Pace it across days. Each phase should ship as its own commit (or small PR) so Matt can review and pull production rollback if anything breaks.

If at any point you're uncertain whether something falls inside the brief or outside it, **ask before acting**. The cost of asking is 30 seconds; the cost of guessing wrong on production is hours of fixing.

— Matt (via Claude)
