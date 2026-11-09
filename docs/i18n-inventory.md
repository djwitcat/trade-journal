# Internationalization inventory

The web app uses `next-intl` with English as the default locale. Set `JOURNAL_LOCALE=zh-CN` before
starting the server to use the Simplified Chinese catalog. `en.json` is the source catalog and
`zh-CN.json` contains the Simplified Chinese translations. The `extracted` namespace contains page,
component, form, chart, accessibility, status, confirmation, and export messages. Provider and
prop-firm enum labels use stable IDs to select catalog entries. Database values, symbols, account
names, API fields, routes, and model IDs remain data.

Use `useTranslations("extracted")` in client components and `getTranslations` in server components.
Use ICU arguments for counts and values so a translation can change word order. Run
`pnpm i18n:audit` to list candidate literals and missing literal keys. The script does not infer
every dynamic expression; review new UI strings when adding a feature.

Server and library errors still use stable English text because API consumers and existing error
classification rely on it. Client notices and common fallbacks use catalog messages where the
display context is known. A separate error-code migration is needed to localize every API error
without changing the API contract.
