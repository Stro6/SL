# How to use this brief — Matt's quick guide

This bundle contains one main file: `CURSOR_BRIEF_v2.md`. That's the document Cursor reads. This README is just for you.

## What's in the brief

23 issues from the audit, organized into 5 phases:

| Phase | What it fixes | Time | Blocking? |
|---|---|---|---|
| **Phase 1** | Fake portfolio, no checkout, stub legal docs, redirect homepage, positioning conflict, dead contact form | ~6 hrs | **Yes — must do before any marketing** |
| **Phase 2** | Site is invisible to Google (no robots, sitemap, meta tags, schema) | ~3 hrs | Required for organic traffic, not for paid |
| **Phase 3** | Custom email, analytics, favicon, mobile audit, image optimization | ~4 hrs | Trust/polish — pre-launch |
| **Phase 4** | Resend DNS, Stripe live mode, $1 live test, CSP header, secret scan | ~3 hrs + DNS waits | **Yes — must do before live mode** |
| **Phase 5** | About/Pricing/Blog, FAQ schema, newsletter, future case studies | varies | No — nice-to-haves |

## How to feed this to Cursor

1. Make sure your Cursor workspace has access to:
   - Your website's GitHub repo
   - Your mobile app project (reference only)
   - The legal docs from the earlier session (`legal-bundle/` folder)
   - This `CURSOR_BRIEF_v2.md` file

2. Open Cursor's chat and paste:

> Read `CURSOR_BRIEF_v2.md` completely before doing anything. Then start Phase 1. Stop after Phase 1 and report back before continuing.

3. Cursor will work through Phase 1, then summarize what it did. **Review the changes before approving.** Don't just say "yes go" — actually look at what was committed.

4. Hard-refresh stromatic.tech to confirm the changes look right on production (GitHub Pages deploys on push).

5. Move to Phase 2 only after Phase 1 is solid.

## Things ONLY you can do

Cursor cannot do these — they require your accounts:

- **Phase 1.6:** Set up Formspree or confirm where the contact form should go
- **Phase 2.6:** Decide whether to keep or remove the newsletter signup
- **Phase 2 deliverable:** Submit sitemap to Google Search Console
- **Phase 3.1:** Sign up for Google Workspace, set up custom email
- **Phase 3.2:** Sign up for Plausible Analytics
- **Phase 4.1:** Add DNS records for Resend domain verification
- **Phase 4.2:** Activate Stripe live mode (provide your SIN, bank, ID)
- **Phase 4.3:** Run a $1 live test to yourself

I've documented each of these with explicit step-by-step instructions inside the brief, so you'll know exactly what to do when you get to them.

## Decisions you should pre-make so Cursor doesn't have to ask

Before starting Phase 1, decide:

1. **Newsletter:** keep it (need a provider) or remove it? (I recommended remove for v1.)
2. **About/Pricing/Blog pages:** remove them or write real ones? (I recommended remove for v1.)
3. **Contact form destination:** Formspree (simplest, free for 50/month) or build a custom Supabase function (more work, more control)? (I recommended Formspree for v1.)

If you go with my recommendations, Cursor can run Phase 1 without further input from you. If you want different choices, decide before starting.

## Order of priority if you can't do everything

If you only have time for the absolute minimum to get a working revenue-capable site:

**Bare minimum:** Phase 1.1 (kill fake portfolio), Phase 1.2 (Stripe checkout), Phase 1.3 (legal docs), Phase 1.4 (homepage redirect), Phase 4.1 (Resend DNS), Phase 4.2 (Stripe live mode).

That's ~5 hours. Everything else is improvement on top of a working baseline.

---

## After all 5 phases are done

The site is in good shape. You're ready for paid ads / cold outreach / whatever distribution channel you pick. Re-read the strategic notes from the earlier session for the day 30 / 60 / 90 game plan — that part hasn't changed.

Good luck.
