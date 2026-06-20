# Third-Party Notices

This project includes or depends on third-party software, data, and standards.

## Runtime and framework dependencies

- `Next.js`
- `React`
- `React DOM`
- `Tailwind CSS`
- `TypeScript`
- `ESLint`
- `qrcode`

The exact package versions used by this project are declared in [package.json](./package.json) and locked in [package-lock.json](./package-lock.json). Each dependency remains subject to its own license terms.

## Dictionary data source

This repository includes a Chinese dictionary source file:

- `cedict_ts.u8.gz`

It is used by [scripts/build-dictionary.mjs](./scripts/build-dictionary.mjs) to generate [src/data/dictionary.generated.json](./src/data/dictionary.generated.json), which powers the in-game word list.

The dataset is derived from `CC-CEDICT`. Before republishing, redistributing, or replacing this data, review the upstream license and attribution requirements for the specific source file you use.

## Icons and generated assets

Application icons, manifest assets, and other images in [public](./public) are distributed with this repository for use with this project unless otherwise noted. If you replace them with third-party assets, make sure their licenses allow redistribution.

## External service integration

The optional daily-word enrichment endpoint is configured through `DAILY_WORD_API_BASE`. If you connect this project to a third-party translation or dictionary service, that service's terms of use, rate limits, and attribution requirements are your responsibility.
