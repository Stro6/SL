# Cursor instructions — add legal docs to Stromatic Media

Hey Cursor — please apply this change to my project. All four files in this folder belong to one feature: a legal screen accessible from the landing page that displays Terms of Service, Privacy Policy, and Refund Policy in tabs.

## Files in this folder

| File | Where it goes in the project |
| --- | --- |
| `legalDocs.ts` | **`lib/legalDocs.ts`** — copy here verbatim |
| `legal.tsx` | **`app/legal.tsx`** — copy here verbatim |
| `TERMS.md` | **`docs/legal/TERMS.md`** — copy here for source-of-truth reference |
| `PRIVACY.md` | **`docs/legal/PRIVACY.md`** — same |
| `REFUND.md` | **`docs/legal/REFUND.md`** — same |

> The `docs/legal/` folder is the human-readable source of truth. The `lib/legalDocs.ts` file is what the app actually renders; if Matt edits the markdown later, he must regenerate `legalDocs.ts` (or just edit the embedded template strings in that file directly — they're identical content).

## What you need to do

### 1. Place the files

Create these files at the paths in the table above. Create any folders that don't yet exist (`docs/legal/` will be new).

### 2. Add a footer link on the landing screen

Open `app/index.tsx`. Below the existing `<View style={styles.proof}>...</View>` block, **before** the closing `</ScrollView>`, add a footer link to the legal screen.

Insert this JSX (replace nothing, just append):

```tsx
<Pressable
  onPress={() => router.push('/legal')}
  style={styles.legalLink}
  hitSlop={8}
>
  <Text style={styles.legalLinkText}>
    Terms · Privacy · Refunds
  </Text>
</Pressable>
```

Then add this to the `StyleSheet.create({...})` call at the bottom of the same file (append inside the object, after the existing `divider` style):

```ts
legalLink: {
  marginTop: spacing.xxl,
  alignSelf: 'center',
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.lg,
},
legalLinkText: {
  ...typography.small,
  color: colors.textDim,
  letterSpacing: 0.4,
},
```

### 3. Verify imports on the legal screen

`app/legal.tsx` imports from these existing project paths:

- `../components/GradientBackground`
- `../lib/theme`
- `../lib/legalDocs` (the new file you just created)

If any of those paths don't exist in Matt's project, **stop and tell him** rather than guessing — something is wrong with the project structure.

### 4. Don't change anything else

Specifically: don't touch `app.json`, `package.json`, the existing service screens, the supabase functions, the env files, or the existing components. The legal feature is fully self-contained — one new screen, one new lib file, three reference docs, and a single link added to the landing screen.

### 5. Confirm when done

Reply with:
- The paths of the files you created
- Confirmation that `app/index.tsx` was edited (just the additions, nothing else)
- A note if anything looked off so Matt can review

That's it. Thanks.

---

## For Matt — what this gets you

After Cursor applies this:
- Tap the small "Terms · Privacy · Refunds" link at the bottom of the home screen
- Lands on a screen with three pill tabs at the top
- Each tab renders the full legal document with proper formatting (headings, bold, blockquotes, lists)
- Same purple bubble theme as the rest of the app
- Zero new dependencies — uses the markdown renderer built into the screen itself

If you ever want to update the legal text, edit the template strings in `lib/legalDocs.ts` directly. Bump the "Last Updated" line at the top of each doc when you do.

> **One important note about these documents:** I've written them to be as protective of you as a thoughtful template can be — strict no-refund language, AI/automated-tool disclosure phrased non-descriptively, broad liability caps, mandatory arbitration with class-action waiver, indemnification, IP carve-outs that protect you from clearance disputes, jurisdiction in Ontario. They are *templates*, not legal advice. Before you actually take real customer money, have a Canadian lawyer (one who understands consumer protection, e-commerce, and ideally GDPR/CCPA flow-through) read these in light of your specific business. Most lawyers will mark up a template like this for a few hundred dollars rather than draft from scratch — that's the smart way to spend on this. Matt — I'm an AI, not your lawyer.
