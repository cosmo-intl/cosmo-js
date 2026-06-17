Changelog
=========
* v1.1.0
    - Added `precision(value, fractionDigits = 2, options?)` — formats a number with a
      fixed number of fraction digits (default 2), padding with trailing zeros and
      rounding as needed (`1` → `"1.00"`, `1.002` → `"1.00"`, never `"1.0"`). The trailing
      `NumberOptions` bag widens the band (e.g. `{ maximumFractionDigits: 3 }`) or tweaks
      rounding/grouping. Locale-formatted like `number()`.
* v0.1.0 — initial (unstable) JavaScript / Node port of [salarmehr/cosmopolitan](https://github.com/salarmehr/cosmopolitan)
    - Built entirely on the standard `Intl` API (ICU) with **zero runtime dependencies** and **no bundled locale data**
    - PHP-ported core: `language`, `country`, `script`, `calendar`, `currency` (name + symbol),
      `direction`, `flag`, `number`, `percentage`, `money`, `symbol`, `unit`,
      `message` (ICU MessageFormat subset), `duration`, `moment`, `date`, `time`
    - Collation & search: `compare`, `sort`, `contains` (`Intl.Collator` / `Intl.Segmenter`)
    - Text segmentation: `splitWords`, `splitSentences`, `splitGraphemes`, `ellipsize` (`Intl.Segmenter`)
    - Locale-aware case: `upper`, `lower`
    - Locale metadata: `pluralCategory`, `weekInfo`, `addLikelySubtags`,
      `removeLikelySubtags`, `monthNames` (calendar-aligned), `weekdayNames`, `timeZoneName`,
      `displayName` (generic `Intl.DisplayNames` lookup), `supportedValues` (`Intl.supportedValuesOf`)
    - Directed-duration & range formatting (JS-only): `relativeDuration` (the
      directed-duration counterpart of the undirected `duration`) +
      `relativeDurationBetween(target, reference?)`, `join`, `compact`,
      `scientific`, `numberRange`, `moneyRange`, `dateRange`
    - `duration()` also accepts a unit breakdown (`{ days, hours, minutes, … }`) for multi-unit output
    - `number`/`percentage`/`money` accept a `NumberOptions` bag (`roundingMode`, `roundingIncrement`,
      `min`/`maxFractionDigits`, `useGrouping`); `compare`/`sort`/`contains` accept collation
      tailoring (`{ numeric, caseFirst }`) — all restricted to settings the PHP and Python ports
      also expose, so the contract stays identical across ports
    - Terminology: a point in time is a `Moment`; `duration` is undirected,
      `relativeDuration` is directed; `time`/`timeWidth`/`timeZone` always mean clock/zone
    - `Cosmo.fromSubtags()` and `Cosmo.fromAcceptLanguage()` factories, plus the `cosmo()` helper
    - TypeScript source, ships `.d.ts` types, ESM-only
    - Intentionally **omitted** because they would require ICU facilities the `Intl`
      API does not expose (and the library bundles no data of its own):
      `spellout()` (RBNF), `ordinal()` text such as "1st" (RBNF / suffix data),
      `quote()` (CLDR delimiters), `get()` (raw ICU resource bundles), and automatic
      region→currency inference.
