# Open Source Checklist

This copy is prepared for public release, but review these items before publishing:

1. Confirm that `Copyright (c) 2026 cansnow123 (https://github.com/cansnow123)` in `LICENSE` is the identity you want to publish under.
2. Set your real production domain in:
   - `src/app/layout.tsx`
   - `src/app/sitemap.ts`
   - `src/app/robots.ts`
   - `src/lib/game/share.ts`
3. If you want remote daily-word enrichment, set `DAILY_WORD_API_BASE` in your deployment environment.
4. Review [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) and confirm the CC-CEDICT-derived dictionary data matches your intended redistribution terms.
5. If you plan to publish to GitHub, optionally add repository metadata such as screenshots, topics, and a repo URL in `package.json`.
