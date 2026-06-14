/**
 * Cosmo — application localisation for JavaScript / Node.
 *
 * A thin, ergonomic layer over the standard `Intl` API. It bundles **no** locale
 * data of its own — every result comes straight from the JavaScript engine's ICU.
 * Features that depend on ICU facilities the `Intl` API does not expose (RBNF
 * spellout/ordinal text, CLDR quotation delimiters, raw resource bundles) are
 * intentionally absent rather than reimplemented from hardcoded tables.
 */
import { CosmoError, InvalidArgumentError, UnsupportedError } from "./errors.js";
import { formatMessage, type MessageArgs } from "./message.js";

/** Width of a formatted date, time, unit, … — mirrors ICU's length styles. */
export type FormatWidth = "none" | "short" | "medium" | "long" | "full";

/** Optional locale overrides applied on top of the locale identifier. */
export interface Modifiers {
  /** Calendar identifier, e.g. `"gregory"`, `"persian"`, `"buddhist"`. */
  calendar?: string | null;
  /** ISO 4217 currency code used as the default for {@link Cosmo.money}. */
  currency?: string | null;
  /** IANA time zone, e.g. `"Australia/Sydney"`. */
  timeZone?: string | null;
}

/** Locale subtags parsed from the canonical locale. */
export interface Subtags {
  language: string;
  script: string;
  region: string;
}

/** A moment in time accepted by the date/time methods. Numbers are Unix milliseconds (JS-native). */
export type Moment = Date | number;

// `Intl.DurationFormat` and `Intl.Locale#getTextInfo` are newer than the bundled
// TypeScript lib in some setups; declare the minimal shapes we rely on.
interface DurationFormatLike {
  format(duration: DurationParts): string;
}
interface DurationFormatCtor {
  new (locale: string, options?: { style?: string; hours?: string }): DurationFormatLike;
}
interface TextInfo {
  direction?: string;
}
type LocaleWithTextInfo = Intl.Locale & {
  textInfo?: TextInfo;
  getTextInfo?: () => TextInfo;
};

/** LDML plural category, as returned by `Intl.PluralRules#select`. */
export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

/**
 * Week metadata, mirroring `Intl.Locale#getWeekInfo()`. Days are 1 = Mon … 7 = Sun.
 * `minimalDays` is omitted on runtimes (e.g. current V8) that don't expose it.
 */
export interface WeekInfo {
  firstDay: number;
  weekend: number[];
  minimalDays?: number;
}
type LocaleWithWeekInfo = Intl.Locale & {
  weekInfo?: WeekInfo;
  getWeekInfo?: () => WeekInfo;
};

/** Time-zone name styles accepted by `Intl.DateTimeFormat`'s `timeZoneName`. */
export type TimeZoneNameStyle =
  | "short"
  | "long"
  | "shortOffset"
  | "longOffset"
  | "shortGeneric"
  | "longGeneric";

/** Kinds of list joins exposed by `Intl.ListFormat`. */
export type ListType = "conjunction" | "disjunction" | "unit";

/** Display-name categories accepted by {@link Cosmo.displayName}. */
export type DisplayType = "language" | "region" | "script" | "calendar" | "currency";

/** Keys accepted by {@link Cosmo.supportedValues} / `Intl.supportedValuesOf`. */
export type SupportedKey =
  | "calendar"
  | "collation"
  | "currency"
  | "numberingSystem"
  | "timeZone"
  | "unit";

/**
 * Number-formatting controls for {@link Cosmo.number}, {@link Cosmo.percentage}
 * and {@link Cosmo.money}. Field names match `Intl.NumberFormat`'s options.
 *
 * Most fields map onto an ICU setting the PHP and Python ports expose too, so the
 * contract is identical across all three ports. The exceptions are flagged inline
 * as **JS port only**: these have no equivalent in the legacy ICU `NumberFormatter`
 * (PHP) / `DecimalFormat` (Python) APIs those ports use, so they take effect in the
 * JS port and are silently ignored by the others.
 */
export interface NumberOptions {
  /** Minimum integer digits; zero-pads the whole part (`5` → `"005"` at 3). */
  minimumIntegerDigits?: number;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  /** Minimum significant digits (ICU treats significant- and fraction-digit limits as mutually exclusive). */
  minimumSignificantDigits?: number;
  /** Maximum significant digits. */
  maximumSignificantDigits?: number;
  /** ICU-portable rounding modes (these have a direct ICU equivalent in every port). */
  roundingMode?: "ceil" | "floor" | "expand" | "trunc" | "halfExpand" | "halfTrunc" | "halfEven";
  roundingIncrement?: 1 | 2 | 5 | 10 | 20 | 25 | 50 | 100 | 200 | 250 | 500 | 1000 | 2000 | 2500 | 5000;
  /** JS accepts the full union; the PHP and Python ports coerce any truthy value to "on". */
  useGrouping?: "always" | "auto" | "min2" | boolean;
  /** **JS port only** — ignored by the PHP and Python ports (legacy ICU formatters have no sign-display attribute). */
  signDisplay?: "auto" | "always" | "exceptZero" | "negative" | "never";
  /** **JS port only** — ignored by the PHP and Python ports. */
  trailingZeroDisplay?: "auto" | "stripIfInteger";
  /** **JS port only** — ignored by the PHP and Python ports. */
  roundingPriority?: "auto" | "morePrecision" | "lessPrecision";
  /** **JS port only** — ignored by PHP/Python; for those ports use the dedicated `compact()` / `scientific()` methods instead. */
  notation?: "standard" | "scientific" | "engineering" | "compact";
  /** Only meaningful with `notation: "compact"`. **JS port only** — ignored by the PHP and Python ports. */
  compactDisplay?: "short" | "long";
}

/** Collation tailoring for {@link Cosmo.compare}, {@link Cosmo.sort}, {@link Cosmo.contains}. */
export interface CollationOptions {
  /** Sort numeric substrings by value (`"item2"` < `"item10"`). */
  numeric?: boolean;
  /** Whether upper- or lower-case sorts first. */
  caseFirst?: "upper" | "lower" | "false";
}

/** A breakdown of a duration into units, accepted by {@link Cosmo.duration}. */
export interface DurationParts {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

// `formatRange` exists on NumberFormat (Node 22+) and DateTimeFormat but is not in
// every bundled TS lib; declare the minimal shape we cast to.
interface RangeFormatter {
  formatRange(start: number | bigint | Date, end: number | bigint | Date): string;
}

const WIDTH_TO_DATE_STYLE: Record<Exclude<FormatWidth, "none">, "short" | "medium" | "long" | "full"> = {
  short: "short",
  medium: "medium",
  long: "long",
  full: "full",
};

const WIDTH_TO_UNIT_DISPLAY: Record<FormatWidth, "long" | "short" | "narrow"> = {
  none: "long",
  short: "narrow",
  medium: "short",
  long: "long",
  full: "long",
};

const VALID_WIDTHS: ReadonlySet<string> = new Set(["none", "short", "medium", "long", "full"]);

function assertWidth(width: string): FormatWidth {
  if (!VALID_WIDTHS.has(width)) {
    throw new InvalidArgumentError(`"${width}" is not a valid format width (use none/short/medium/long/full).`);
  }
  return width as FormatWidth;
}

/** Normalises an underscore (`en_AU`) or BCP-47 (`en-AU`) tag to a canonical BCP-47 tag. */
function canonicaliseLocale(input?: string | null): string {
  const raw = (input ?? "").trim() || defaultLocale();
  const bcp47 = raw.replace(/_/g, "-");
  try {
    return Intl.getCanonicalLocales(bcp47)[0] ?? bcp47;
  } catch {
    return new Intl.Locale(bcp47).toString();
  }
}

function defaultLocale(): string {
  return new Intl.DateTimeFormat().resolvedOptions().locale;
}

function toDate(moment: Moment): Date {
  return moment instanceof Date ? moment : new Date(moment);
}

export class Cosmo {
  /** Canonical BCP-47 locale identifier, e.g. `"en-AU"`. */
  readonly locale: string;
  /** Parsed language / script / region subtags. */
  readonly subtags: Subtags;
  /** Resolved modifiers (calendar / currency / timeZone). */
  readonly modifiers: Required<Modifiers>;

  private readonly intlLocale: Intl.Locale;

  /**
   * @param locale BCP-47 (or underscore-separated `en_AU`) locale identifier. Unicode
   *   extensions such as `-u-nu-latn-ca-buddhist` are honoured. Defaults to the
   *   runtime locale.
   * @param modifiers Optional `calendar`, `currency`, and `timeZone` overrides.
   */
  constructor(locale?: string | null, modifiers: Modifiers = {}) {
    this.locale = canonicaliseLocale(locale);
    this.intlLocale = new Intl.Locale(this.locale);

    this.subtags = {
      language: this.intlLocale.language ?? "",
      script: this.intlLocale.script ?? "",
      region: this.intlLocale.region ?? "",
    };

    this.modifiers = {
      calendar: modifiers.calendar ?? this.intlLocale.calendar ?? null,
      currency: modifiers.currency ?? null,
      timeZone: modifiers.timeZone ?? null,
    };
  }

  /**
   * Builds a Cosmo from locale subtags instead of a string.
   * @example Cosmo.fromSubtags({ language: "en", region: "AU" })
   */
  static fromSubtags(subtags: Partial<Subtags>, modifiers: Modifiers = {}): Cosmo {
    // Build via the Intl.Locale options bag (rather than string-joining) so the
    // subtags are validated and canonicalised.
    const tag = new Intl.Locale(subtags.language || "und", {
      script: subtags.script || undefined,
      region: subtags.region || undefined,
    }).toString();
    return new Cosmo(tag, modifiers);
  }

  /**
   * Builds a Cosmo from an HTTP `Accept-Language` header, picking the
   * highest-quality tag.
   */
  static fromAcceptLanguage(header: string, modifiers: Modifiers = {}): Cosmo {
    const best = (header ?? "")
      .split(",")
      .map((part) => {
        const [tag, ...params] = part.trim().split(";");
        const q = params.find((p) => p.trim().startsWith("q="));
        return { tag: (tag ?? "").trim(), q: q ? Number(q.split("=")[1]) : 1 };
      })
      .filter((e) => e.tag && e.tag !== "*")
      .sort((a, b) => b.q - a.q)[0];
    return new Cosmo(best?.tag, modifiers);
  }

  // #region key → value lookups (Intl.DisplayNames)

  private display(type: Intl.DisplayNamesType, code: string): string {
    try {
      return new Intl.DisplayNames([this.locale], { type, fallback: "code" }).of(code) ?? "";
    } catch {
      return "";
    }
  }

  /**
   * Localised language name (e.g. `"en"` → `"English"`, in `fa` → `"انگلیسی"`).
   * Accepts a bare language code or a full locale (the language subtag is used).
   * Returns `""` for an empty/nullish argument.
   */
  language(code: string | null = this.locale): string {
    if (!code) return "";
    let lang = code;
    try {
      lang = new Intl.Locale(code.replace(/_/g, "-")).language ?? code;
    } catch {
      /* use as-is */
    }
    return this.display("language", lang);
  }

  /**
   * Localised country/region name (e.g. `"AU"` → `"Australia"`).
   * Accepts a region code or a locale containing one. Returns `""` when empty.
   */
  country(code: string | null = this.subtags.region): string {
    if (!code) return "";
    let region = code;
    if (/[-_]/.test(code)) {
      try {
        region = new Intl.Locale(code.replace(/_/g, "-")).region ?? "";
      } catch {
        region = "";
      }
    }
    if (!region) return "";
    return this.display("region", region.toUpperCase());
  }

  /**
   * Localised script name (e.g. `"Latn"` → `"Latin"`). Defaults to the locale's
   * script subtag. Returns `""` when there is no script.
   */
  script(code: string | null = this.subtags.script): string {
    if (!code) return "";
    const titled = code.charAt(0).toUpperCase() + code.slice(1).toLowerCase();
    return this.display("script", titled);
  }

  /**
   * Localised calendar name (e.g. `"buddhist"` → `"Buddhist Calendar"`).
   * Returns `""` for an empty argument.
   */
  calendar(code: string): string {
    if (!code) return "";
    return this.display("calendar", code);
  }

  /**
   * Localised currency name (default) or symbol.
   * @param code ISO 4217 code; defaults to the `currency` modifier.
   * @param symbol When `true`, returns the standard (disambiguated) symbol — e.g.
   *   `"A$"` for AUD in `en-US`, not the ambiguous narrow `"$"`.
   * @param strict Throw on an unknown currency instead of echoing the code back.
   */
  currency(code: string | null = this.modifiers.currency, symbol = false, strict = false): string {
    const ccy = (code ?? "").toUpperCase();
    if (!ccy) return "";

    if (symbol) {
      try {
        const parts = new Intl.NumberFormat(this.locale, {
          style: "currency",
          currency: ccy,
          currencyDisplay: "symbol",
        }).formatToParts(1);
        return parts.find((p) => p.type === "currency")?.value ?? ccy;
      } catch {
        if (strict) throw new InvalidArgumentError(`"${ccy}" is not a valid currency code.`);
        return ccy;
      }
    }

    let name: string;
    try {
      name = new Intl.DisplayNames([this.locale], { type: "currency", fallback: "code" }).of(ccy) ?? ccy;
    } catch {
      name = ccy;
    }
    // DisplayNames echoes the (upper-cased) code back when the currency is unknown.
    if (name === ccy && strict) {
      throw new InvalidArgumentError(`"${ccy}" is not a valid currency code.`);
    }
    return name;
  }

  /** Text direction of the locale (or a given language): `"rtl"` or `"ltr"`. */
  direction(language: string | null = this.locale): string {
    try {
      const loc = new Intl.Locale((language ?? this.locale).replace(/_/g, "-")) as LocaleWithTextInfo;
      const info = typeof loc.getTextInfo === "function" ? loc.getTextInfo() : loc.textInfo;
      return info?.direction === "rtl" ? "rtl" : "ltr";
    } catch {
      return "ltr";
    }
  }

  /**
   * Country flag emoji for a region (e.g. `"AU"` → `"🇦🇺"`). Defaults to the
   * locale's region. Uses the Unicode regional-indicator transform, so no data
   * table is involved.
   */
  flag(country: string | null = this.subtags.region): string {
    const region = (country ?? "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(region)) return "";
    const A = 0x1f1e6 - 0x41; // regional indicator offset
    return String.fromCodePoint(region.charCodeAt(0) + A, region.charCodeAt(1) + A);
  }

  // #endregion

  // #region numbers

  /**
   * Formats a number using the locale's default decimal format.
   * @param options Optional rounding/grouping controls ({@link NumberOptions}).
   */
  number(value: number, options: NumberOptions = {}): string {
    return new Intl.NumberFormat(this.locale, { ...options }).format(value);
  }

  /**
   * Formats a fraction as a localised percentage (e.g. `0.2` → `"20%"`).
   * @param precision Maximum fraction digits (default 3).
   * @param options Optional rounding/grouping controls ({@link NumberOptions});
   *   an explicit `maximumFractionDigits` here overrides `precision`.
   */
  percentage(value: number, precision = 3, options: NumberOptions = {}): string {
    return new Intl.NumberFormat(this.locale, {
      style: "percent",
      maximumFractionDigits: precision,
      ...options,
    }).format(value);
  }

  /**
   * Formats a monetary value.
   *
   * No currency is inferred from the region: the `Intl` API exposes no
   * region→currency mapping, and this library bundles no data. Provide a
   * currency code or set the `currency` modifier.
   *
   * @returns The formatted amount, or `""` when no currency is available
   *   (unless `strict`, which throws).
   */
  money(
    value: number,
    code: string | null = this.modifiers.currency,
    options: { precision?: number; strict?: boolean } & NumberOptions = {},
  ): string {
    options ??= {}; // the `= {}` default only covers undefined, not an explicit null
    const ccy = (code ?? "").toUpperCase();
    if (!ccy) {
      if (options.strict) {
        throw new InvalidArgumentError("No currency provided. Pass a code or set the `currency` modifier.");
      }
      return "";
    }
    // A malformed code makes Intl.NumberFormat throw a raw RangeError; reject it
    // up front so callers get the same branded error as currency() does.
    if (!/^[A-Z]{3}$/.test(ccy)) {
      throw new InvalidArgumentError(`"${ccy}" is not a valid currency code.`);
    }
    const { precision, strict, ...numberOptions } = options;
    void strict;
    const fmtOptions: Intl.NumberFormatOptions = {
      style: "currency",
      currency: ccy,
      ...numberOptions,
    };
    if (precision != null) {
      fmtOptions.minimumFractionDigits ??= precision;
      fmtOptions.maximumFractionDigits ??= precision;
    }
    return new Intl.NumberFormat(this.locale, fmtOptions).format(value);
  }

  /**
   * Returns a single localised number symbol that the `Intl` API exposes via
   * `formatToParts` (decimal/group separators, percent, sign symbols, nan,
   * infinity). Symbols ICU keeps internal (permille, pad escape, …) are not
   * available and throw.
   *
   * @param name One of: `decimal`, `group`, `percent`, `minusSign`, `plusSign`,
   *   `nan`, `infinity`, `currency` (case/`_`-insensitive; `_separator`/`_symbol`
   *   suffixes are ignored).
   */
  symbol(name: string): string {
    const key = name.toLowerCase().replace(/[_\s-]/g, "").replace(/separator$|symbol$|sign$/g, "");
    const nf = (opts: Intl.NumberFormatOptions, value: number, type: Intl.NumberFormatPartTypes): string => {
      const part = new Intl.NumberFormat(this.locale, opts).formatToParts(value).find((p) => p.type === type);
      return part?.value ?? "";
    };
    switch (key) {
      case "decimal":
        return nf({ minimumFractionDigits: 1 }, 1.1, "decimal");
      case "group":
      case "grouping":
        return nf({ useGrouping: true }, 1000, "group");
      case "percent":
        return nf({ style: "percent" }, 0, "percentSign");
      case "minus":
        return nf({ signDisplay: "always" }, -1, "minusSign");
      case "plus":
        return nf({ signDisplay: "always" }, 1, "plusSign");
      case "nan":
        return nf({}, NaN, "nan");
      case "infinity":
      case "infinite":
        return nf({}, Infinity, "infinity");
      case "currency":
        return nf({ style: "currency", currency: "USD", currencyDisplay: "symbol" }, 1, "currency");
      default:
        throw new InvalidArgumentError(
          `"${name}" is not a number symbol exposed by Intl. ` +
            `Available: decimal, group, percent, minusSign, plusSign, nan, infinity, currency.`,
        );
    }
  }

  /**
   * Formats a measurement with a localised unit (e.g. `2.19` gigabytes).
   * @param category Informational unit category (e.g. `"digital"`); accepted for
   *   descriptive grouping but not required by `Intl`.
   * @param unit The unit identifier, e.g. `"gigabyte"`, `"celsius"`, `"gram"`.
   *   Must be one of the units sanctioned by ECMA-402.
   * @param value Numeric value.
   * @param width `full`/`long` → long, `medium` → short, `short` → narrow.
   * @throws CosmoError if the unit is not supported by `Intl`.
   * @see https://tc39.es/ecma402/#table-sanctioned-single-unit-identifiers
   */
  unit(category: string, unit: string, value: number, width: FormatWidth = "full"): string {
    void category;
    const unitDisplay = WIDTH_TO_UNIT_DISPLAY[assertWidth(width)];
    try {
      return new Intl.NumberFormat(this.locale, { style: "unit", unit, unitDisplay }).format(value);
    } catch {
      throw new InvalidArgumentError(
        `"${unit}" is not a unit supported by the Intl API (ECMA-402 sanctioned units only).`,
      );
    }
  }

  /** Formats an ICU MessageFormat pattern (subset: args, number, plural, select). */
  message(pattern: string, args: MessageArgs = {}): string {
    return formatMessage(this.locale, pattern, args);
  }

  /**
   * Formats an **undirected** duration (magnitude only) given in **seconds**.
   * For the directed form (with a past/future orientation, e.g. "3 days ago")
   * see {@link Cosmo.relativeDuration}.
   * @param withWords When `true`, spells out the units (`"339 hours, …"`),
   *   otherwise uses the digital clock form (`"339:27:40"`).
   *
   * Requires `Intl.DurationFormat` (Node 22+). Both forms are produced entirely
   * by ICU.
   */
  duration(value: number | DurationParts, withWords = false): string {
    const DurationFormat = (Intl as unknown as { DurationFormat?: DurationFormatCtor }).DurationFormat;
    if (typeof DurationFormat !== "function") {
      throw new UnsupportedError("duration() requires Intl.DurationFormat (Node 22+).");
    }
    // A breakdown of arbitrary units (days/weeks/…) — render them as-is.
    if (typeof value !== "number") {
      return new DurationFormat(this.locale, { style: withWords ? "long" : "short" }).format(value);
    }
    // A scalar number of seconds — split into the hours/minutes/seconds clock form.
    const total = Math.trunc(value);
    const parts = {
      hours: Math.trunc(total / 3600),
      minutes: Math.trunc((total % 3600) / 60),
      seconds: total % 60,
    };
    const options = withWords
      ? { style: "long" }
      : { style: "digital", hours: "numeric" };
    return new DurationFormat(this.locale, options).format(parts);
  }

  // #endregion

  // #region dates & times

  private dateTimeFormat(
    dateWidth: FormatWidth,
    timeWidth: FormatWidth,
    calendar?: string | null,
  ): Intl.DateTimeFormat {
    const options: Intl.DateTimeFormatOptions = {};
    if (dateWidth !== "none") options.dateStyle = WIDTH_TO_DATE_STYLE[dateWidth];
    if (timeWidth !== "none") options.timeStyle = WIDTH_TO_DATE_STYLE[timeWidth];

    const cal = calendar === "gregorian" ? "gregory" : calendar ?? this.modifiers.calendar;
    if (cal) options.calendar = cal;
    if (this.modifiers.timeZone) options.timeZone = this.modifiers.timeZone;

    return new Intl.DateTimeFormat(this.locale, options);
  }

  /**
   * Formats a moment (date and/or time) using the locale's conventions.
   * @param moment A `Date` or Unix-millisecond timestamp.
   * @param dateWidth `none`/`short`/`medium`/`long`/`full` (default `short`).
   * @param timeWidth `none`/`short`/`medium`/`long`/`full` (default `short`).
   * @param calendar Pass `"gregorian"` to force Gregorian; otherwise the
   *   locale/modifier calendar is used.
   */
  moment(
    moment: Moment,
    dateWidth: FormatWidth = "short",
    timeWidth: FormatWidth = "short",
    calendar?: string | null,
  ): string {
    assertWidth(dateWidth);
    assertWidth(timeWidth);
    if (dateWidth === "none" && timeWidth === "none") return "";
    return this.dateTimeFormat(dateWidth, timeWidth, calendar).format(toDate(moment));
  }

  /** Formats just the date part of a moment. */
  date(moment: Moment, width: FormatWidth = "short"): string {
    return this.moment(moment, width, "none");
  }

  /** Formats just the time (clock) part of a moment. */
  time(moment: Moment, width: FormatWidth = "short"): string {
    return this.moment(moment, "none", width);
  }

  // #endregion

  // #region collation (Intl.Collator)

  /**
   * Locale-aware comparison of two strings, suitable for `Array#sort`.
   * Returns a negative number, `0`, or a positive number.
   */
  compare(a: string, b: string, options: CollationOptions = {}): number {
    return new Intl.Collator(this.locale, { ...options }).compare(a, b);
  }

  /**
   * Returns a new array sorted by the locale's collation rules.
   * @param key Optional accessor returning the string to sort each item by.
   * @param options Optional collation tailoring ({@link CollationOptions}).
   */
  sort<T>(items: readonly T[], key?: (item: T) => string, options: CollationOptions = {}): T[] {
    const collator = new Intl.Collator(this.locale, { ...options });
    const get = key ?? ((item: T) => String(item));
    return [...items].sort((a, b) => collator.compare(get(a), get(b)));
  }

  /**
   * Locale-aware substring test that honours the locale's collation, so
   * accents/case can be ignored.
   * @param sensitivity `base` (ignore case & accents, default), `accent`,
   *   `case`, or `variant` (exact). See `Intl.Collator`.
   */
  contains(
    haystack: string,
    needle: string,
    sensitivity: "base" | "accent" | "case" | "variant" = "base",
    options: CollationOptions = {},
  ): boolean {
    if (needle === "") return true;
    const collator = new Intl.Collator(this.locale, { usage: "search", sensitivity, ...options });
    const seg = new Intl.Segmenter(this.locale, { granularity: "grapheme" });
    const hay = [...seg.segment(haystack)].map((s) => s.segment);
    const need = [...seg.segment(needle)].length;
    for (let i = 0; i + need <= hay.length; i++) {
      if (collator.compare(hay.slice(i, i + need).join(""), needle) === 0) return true;
    }
    return false;
  }

  // #endregion

  // #region text segmentation (Intl.Segmenter)

  /**
   * Splits text into words using the locale's word-boundary rules, keeping only
   * word-like segments (drops whitespace and punctuation). Mirrors ICU's
   * word `BreakIterator`.
   */
  splitWords(text: string): string[] {
    const seg = new Intl.Segmenter(this.locale, { granularity: "word" });
    return [...seg.segment(text)].filter((s) => s.isWordLike).map((s) => s.segment);
  }

  /** Splits text into sentences using the locale's sentence-boundary rules. */
  splitSentences(text: string): string[] {
    const seg = new Intl.Segmenter(this.locale, { granularity: "sentence" });
    return [...seg.segment(text)].map((s) => s.segment.trim()).filter(Boolean);
  }

  /**
   * Truncates text to at most `max` graphemes, breaking on a word boundary and
   * appending `ellipsis`. Grapheme- and word-aware via `Intl.Segmenter`, so it
   * never splits a combining sequence. Returns the original text if it already
   * fits.
   */
  ellipsize(text: string, max: number, ellipsis = "…"): string {
    const graphemes = [...new Intl.Segmenter(this.locale, { granularity: "grapheme" }).segment(text)];
    if (graphemes.length <= max) return text;

    const budget = Math.max(0, max - [...ellipsis].length);
    const head = graphemes.slice(0, budget).map((s) => s.segment).join("");

    // Prefer to cut at the last word boundary that still fits.
    const words = [...new Intl.Segmenter(this.locale, { granularity: "word" }).segment(head)];
    let cut = head;
    const last = words.at(-1);
    if (words.length > 1 && last && last.index > 0) {
      cut = head.slice(0, last.index).trimEnd();
    }
    return (cut || head.trimEnd()) + ellipsis;
  }

  /**
   * Splits text into grapheme clusters (user-perceived characters), so combining
   * marks and emoji ZWJ sequences stay intact. Mirrors `Intl.Segmenter`
   * `granularity:"grapheme"`.
   */
  splitGraphemes(text: string): string[] {
    return [...new Intl.Segmenter(this.locale, { granularity: "grapheme" }).segment(text)].map(
      (s) => s.segment,
    );
  }

  // #endregion

  // #region locale metadata

  /**
   * The LDML plural category a number falls into for this locale
   * (e.g. `1` → `"one"`, `2` → `"other"` in English). Mirrors the category
   * selection inside ICU `MessageFormat`.
   * @param ordinal Use ordinal rules (1st/2nd/3rd …) instead of cardinal.
   */
  pluralCategory(value: number, ordinal = false): PluralCategory {
    return new Intl.PluralRules(this.locale, {
      type: ordinal ? "ordinal" : "cardinal",
    }).select(value) as PluralCategory;
  }

  /**
   * Week conventions for the locale: first day of the week, weekend days, and
   * the minimal days in the first week. Mirrors `IntlCalendar` accessors.
   * @throws CosmoError if the runtime lacks `Intl.Locale#getWeekInfo`.
   */
  weekInfo(): WeekInfo {
    const loc = this.intlLocale as LocaleWithWeekInfo;
    const info = typeof loc.getWeekInfo === "function" ? loc.getWeekInfo() : loc.weekInfo;
    if (!info) {
      throw new UnsupportedError("weekInfo() requires Intl.Locale#getWeekInfo() support.");
    }
    const result: WeekInfo = { firstDay: info.firstDay, weekend: [...info.weekend] };
    if (info.minimalDays != null) result.minimalDays = info.minimalDays;
    return result;
  }

  /**
   * Returns a new Cosmo with likely subtags added (e.g. `"en"` → `"en-Latn-US"`).
   * Uses `Intl.Locale#maximize`.
   */
  addLikelySubtags(): Cosmo {
    return new Cosmo(this.intlLocale.maximize().toString(), this.modifiers);
  }

  /**
   * Returns a new Cosmo with likely subtags removed (e.g. `"en-Latn-US"` → `"en"`).
   * Uses `Intl.Locale#minimize`.
   */
  removeLikelySubtags(): Cosmo {
    return new Cosmo(this.intlLocale.minimize().toString(), this.modifiers);
  }

  /**
   * Localised month names (January … December), following the active calendar.
   * Mirrors `IntlDateFormatter` month symbols.
   */
  monthNames(width: FormatWidth = "full"): string[] {
    const month = WIDTH_TO_UNIT_DISPLAY[assertWidth(width)];
    const cal = this.modifiers.calendar === "gregorian" ? "gregory" : this.modifiers.calendar ?? undefined;
    const nameFmt = new Intl.DateTimeFormat(this.locale, { month, timeZone: "UTC", calendar: cal });
    // Calendars don't line up with Gregorian months, so place each name by the
    // calendar's own month ordinal rather than by Gregorian position. The ordinal
    // formatter must use the same calendar `nameFmt` resolved (the locale can imply
    // one, e.g. fa-IR → persian, even when no modifier is set).
    const resolvedCal = nameFmt.resolvedOptions().calendar;
    const ordFmt = new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: "UTC", calendar: resolvedCal });
    const names = new Array<string>(12).fill("");
    const start = Date.UTC(2023, 0, 1);
    for (let day = 0; day < 400; day++) {
      const ms = start + day * 86_400_000;
      const idx = Number.parseInt(ordFmt.format(ms), 10) - 1;
      if (idx >= 0 && idx < 12 && !names[idx]) {
        names[idx] = nameFmt.formatToParts(ms).find((p) => p.type === "month")?.value ?? "";
      }
    }
    return names;
  }

  /**
   * Localised weekday names, **Sunday first** (matching ICU symbol order).
   * Mirrors `IntlDateFormatter` weekday symbols.
   */
  weekdayNames(width: FormatWidth = "full"): string[] {
    const weekday = WIDTH_TO_UNIT_DISPLAY[assertWidth(width)];
    const fmt = new Intl.DateTimeFormat(this.locale, { weekday, timeZone: "UTC" });
    // 2021-08-01 (UTC) is a Sunday.
    return Array.from({ length: 7 }, (_, d) =>
      fmt.formatToParts(Date.UTC(2021, 7, 1 + d)).find((p) => p.type === "weekday")?.value ?? "",
    );
  }

  /**
   * Localised display name of a time zone (e.g. `"Australian Eastern Standard Time"`).
   * Defaults to the `timeZone` modifier, falling back to the runtime zone.
   * @param style `long` (default), `short`, `shortOffset`, `longOffset`,
   *   `shortGeneric`, or `longGeneric`.
   */
  timeZoneName(style: TimeZoneNameStyle = "long"): string {
    const timeZone = this.modifiers.timeZone ?? new Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = new Intl.DateTimeFormat(this.locale, { timeZone, timeZoneName: style }).formatToParts(Date.now());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  }

  /**
   * Generic localised display name — a single entry point over the dedicated
   * lookups. Mirrors `Intl.DisplayNames`.
   * @param type `language`, `region`, `script`, `calendar`, or `currency`.
   * @param code The code to translate (e.g. `"en"`, `"AU"`, `"Hans"`, `"buddhist"`, `"EUR"`).
   */
  displayName(type: DisplayType, code: string): string {
    switch (type) {
      case "language":
        return this.language(code);
      case "region":
        return this.country(code);
      case "script":
        return this.script(code);
      case "calendar":
        return this.calendar(code);
      case "currency":
        return this.currency(code);
      default:
        throw new InvalidArgumentError(
          `"${type}" is not a display-name type (use language/region/script/calendar/currency).`,
        );
    }
  }

  /**
   * The values the runtime's ICU supports for a given key (e.g. all IANA time
   * zones, calendars, currencies). Mirrors `Intl.supportedValuesOf`.
   * @param key `calendar`, `collation`, `currency`, `numberingSystem`, `timeZone`, or `unit`.
   */
  supportedValues(key: SupportedKey): string[] {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    if (typeof fn !== "function") {
      throw new UnsupportedError("supportedValues() requires Intl.supportedValuesOf (Node 18+).");
    }
    return fn(key);
  }

  // #endregion

  // #region case transforms

  /** Locale-aware upper-casing (e.g. Turkish dotted/dotless I). */
  upper(text: string): string {
    return text.toLocaleUpperCase(this.locale);
  }

  /** Locale-aware lower-casing. */
  lower(text: string): string {
    return text.toLocaleLowerCase(this.locale);
  }

  // #endregion

  // #region relative time, lists, ranges & notation

  /**
   * Renders a **directed duration** — a signed amount carrying a past/future
   * orientation — in the locale's words (e.g. `(-3, "day")` → `"3 days ago"`,
   * `(2, "hour")` → `"in 2 hours"`). The directed counterpart of
   * {@link Cosmo.duration}, which is undirected (magnitude only). Wraps
   * `Intl.RelativeTimeFormat`.
   * @param amount Signed amount: negative = past (`"… ago"`), positive = future
   *   (`"in …"`).
   * @param unit `second`, `minute`, `hour`, `day`, `week`, `month`, `quarter`, `year`.
   * @param numeric `always` (default, "1 day ago") or `auto` (allows "yesterday").
   */
  relativeDuration(
    amount: number,
    unit: Intl.RelativeTimeFormatUnit,
    numeric: "always" | "auto" = "always",
  ): string {
    return new Intl.RelativeTimeFormat(this.locale, { numeric }).format(amount, unit);
  }

  /**
   * Renders the directed duration **between two moments** as relative text,
   * auto-selecting the largest sensible unit (e.g. `"in 5 days"`,
   * `"3 days ago"`). Computes `target − reference`, then formats via
   * {@link Cosmo.relativeDuration}. JS-only.
   * @param target The moment being described.
   * @param reference The moment `target` is measured against. **Defaults to
   *   now.** When `target` is after `reference` the result is future (`"in …"`);
   *   when before, it is past (`"… ago"`).
   * @param numeric `auto` (default, allows "yesterday") or `always`.
   */
  relativeDurationBetween(
    target: Moment,
    reference: Moment = Date.now(),
    numeric: "always" | "auto" = "auto",
  ): string {
    const diffSeconds = (toDate(target).getTime() - toDate(reference).getTime()) / 1000;
    const divisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
      { amount: 60, unit: "second" },
      { amount: 60, unit: "minute" },
      { amount: 24, unit: "hour" },
      { amount: 7, unit: "day" },
      { amount: 4.34524, unit: "week" },
      { amount: 12, unit: "month" },
      { amount: Number.POSITIVE_INFINITY, unit: "year" },
    ];
    const rtf = new Intl.RelativeTimeFormat(this.locale, { numeric });
    let amount = diffSeconds;
    for (const division of divisions) {
      if (Math.abs(amount) < division.amount) {
        return rtf.format(Math.round(amount), division.unit);
      }
      amount /= division.amount;
    }
    return rtf.format(Math.round(amount), "year");
  }

  /**
   * Joins a list using the locale's conventions (e.g. `"A, B, and C"`).
   * Mirrors `Intl.ListFormat`.
   * @param type `conjunction` (and, default), `disjunction` (or), or `unit`.
   * @param width maps to long/short/narrow list styles.
   */
  join(items: readonly string[], type: ListType = "conjunction", width: FormatWidth = "full"): string {
    const style = WIDTH_TO_UNIT_DISPLAY[assertWidth(width)];
    return new Intl.ListFormat(this.locale, { type, style }).format(items as string[]);
  }

  /**
   * Compact number notation (e.g. `1200` → `"1.2K"`, or `"1.2 thousand"`).
   * JS-only.
   * @param width `full`/`long` → long words, otherwise short.
   */
  compact(value: number, width: FormatWidth = "short"): string {
    const compactDisplay = width === "full" || width === "long" ? "long" : "short";
    return new Intl.NumberFormat(this.locale, { notation: "compact", compactDisplay }).format(value);
  }

  /** Scientific notation (e.g. `12345` → `"1.2345E4"`). Mirrors `NumberFormatter::SCIENTIFIC`. */
  scientific(value: number): string {
    // Intl's default of 3 mantissa fraction digits would round 1.2345E4 to
    // 1.235E4; ICU's scientific pattern (#E0, the PHP/Python ports) keeps full
    // precision. 20 covers every double (max ~17 significant digits).
    return new Intl.NumberFormat(this.locale, { notation: "scientific", maximumFractionDigits: 20 }).format(value);
  }

  /** Formats a numeric range (e.g. `"3–5"`). Uses `NumberFormat#formatRange`. JS-only. */
  numberRange(start: number, end: number): string {
    const nf = new Intl.NumberFormat(this.locale) as unknown as RangeFormatter;
    return nf.formatRange(start, end);
  }

  /**
   * Formats a monetary range (e.g. `"$3.00 – $5.00"`). JS-only.
   * @returns `""` when no currency is available (or throws if none and required).
   */
  moneyRange(start: number, end: number, code: string | null = this.modifiers.currency): string {
    const ccy = (code ?? "").toUpperCase();
    if (!ccy) return "";
    const nf = new Intl.NumberFormat(this.locale, {
      style: "currency",
      currency: ccy,
    }) as unknown as RangeFormatter;
    return nf.formatRange(start, end);
  }

  /**
   * Formats a moment range (e.g. `"2–5 Feb 2020"`). Uses `DateTimeFormat#formatRange`. JS-only.
   * @param dateWidth Defaults to `medium` — `short` numeric dates read poorly as
   *   a range, so this differs from {@link Cosmo.date} (which defaults to `short`).
   */
  dateRange(
    start: Moment,
    end: Moment,
    dateWidth: FormatWidth = "medium",
    timeWidth: FormatWidth = "none",
  ): string {
    assertWidth(dateWidth);
    assertWidth(timeWidth);
    const fmt = this.dateTimeFormat(dateWidth, timeWidth) as unknown as RangeFormatter;
    return fmt.formatRange(toDate(start), toDate(end));
  }

  // #endregion
}
