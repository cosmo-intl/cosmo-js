# Cosmo

Ergonomic application localisation for JavaScript / Node, built entirely on the standard [`Intl`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl) API.

Cosmo is a thin, ergonomic layer over the JavaScript engine's own
[ICU](https://icu.unicode.org/), reached through the standard
[`Intl`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl)
API. Give it a locale (and optionally a time zone) and it formats numbers, money,
dates, units, lists and messages exactly the way your users expect. There are **zero
runtime dependencies and zero bundled locale data** — every result comes straight
from ICU and [CLDR](https://cldr.unicode.org/), covering all languages, scripts,
calendars and time zones.

Cosmo is implemented consistently across four languages — the same concepts, method
names and behaviour, each built directly on its platform's ICU:
**JavaScript** ·
[Python](https://github.com/cosmo-intl/cosmo-python) ([docs](https://cosmo.miloun.com/?lang=python)) ·
[Java](https://github.com/cosmo-intl/cosmo-java) ([docs](https://cosmo.miloun.com/?lang=java)) ·
[PHP](https://github.com/salarmehr/cosmopolitan) ([docs](https://cosmo.miloun.com/?lang=php)).

📖 **Full documentation, API reference and live playground:** https://cosmo.miloun.com/?lang=js

## Requirements

- Node 20+ (Node 22+ for `duration()`), or any modern browser
- ESM-only; ships TypeScript type definitions

## Install

```sh
npm install @miloun/cosmo
```

## Quick start

```ts
import { Cosmo, cosmo } from "@miloun/cosmo";

new Cosmo("es_ES").money(11000.4, "EUR");                    // "11.000,40 €"
new Cosmo("tr").unit("temperature", "celsius", 26, "short"); // "26 °C"
new Cosmo("en").percentage(0.2);                             // "20%"
new Cosmo("fa").language("en");                             // "انگلیسی"

// or the helper
cosmo("en_AU").country();                                    // "Australia"
```

Underscore locales (`en_AU`) and [BCP-47](https://www.rfc-editor.org/info/bcp47) [Unicode
extensions](https://unicode.org/reports/tr35/#u_Extension) (`fa-IR-u-nu-latn-ca-buddhist`)
are both accepted.

## What you get

- **Locale display names** — languages, regions, scripts, calendars and currencies, plus emoji flags and writing direction.
- **Numbers & money** — decimals, percentages, currencies, units, compact notation (`1.2M`), scientific, and number/money ranges.
- **Dates & times** — locale formats in any calendar (Gregorian, Persian, Buddhist…), durations, date ranges, and relative times (`"3 days ago"`).
- **Text** — locale-aware sort and search, word/sentence/grapheme segmentation, and case mapping.
- **Lists** — `"A, B, and C"` conjunctions and disjunctions.
- **Messages** — [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/) (`plural`, `selectordinal`, `select`).

See the [full API reference](https://cosmo.miloun.com/api-reference/?lang=js) for every method,
the [platform notes](https://cosmo.miloun.com/platform-notes/) for what `Intl` does and
doesn't expose to JavaScript, and [resources](https://cosmo.miloun.com/resources/) for ICU/CLDR references.

## Errors

Recoverable problems throw `CosmoError`, with `InvalidArgumentError` and
`UnsupportedError` subclasses — an invalid currency in strict mode, an unsupported
unit, an unsupported symbol name, a malformed message, and the like.

## License

MIT © Aiden Adrian