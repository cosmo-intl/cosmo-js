import { test } from "node:test";
import assert from "node:assert/strict";
import { Cosmo, cosmo, formatMessage, CosmoError } from "../dist/index.js";

test("language", () => {
  assert.equal(new Cosmo("en").language("en"), "English");
  assert.equal(new Cosmo("en").language("en_AU"), "English");
  assert.equal(new Cosmo("fa").language("en"), "انگلیسی");
  assert.equal(new Cosmo("fa").language("fa"), "فارسی");
  assert.equal(new Cosmo("en_AU").language(), "English");
  assert.equal(new Cosmo("en").language(""), "");
  assert.equal(new Cosmo("en").language(null), "");
});

test("country", () => {
  assert.equal(new Cosmo("en").country("AU"), "Australia");
  assert.equal(new Cosmo("en_AU").country("AU"), "Australia");
  assert.equal(new Cosmo("fa").country("AU"), "استرالیا");
  assert.equal(new Cosmo("fa").country(""), "");
  assert.equal(new Cosmo("fa").country(null), "");
  assert.equal(new Cosmo("en_AU").country(), "Australia");
  assert.equal(new Cosmo("en").country(), "");
});

test("script", () => {
  assert.equal(new Cosmo("en_Latn_AU").script(), "Latin");
  assert.equal(new Cosmo("en_Latn_AU").script(""), "");
  assert.equal(new Cosmo("en").script(), "");
  assert.equal(new Cosmo("en").script("Hans"), "Simplified"); // ICU 77 display name
});

test("calendar", () => {
  assert.equal(new Cosmo("en").calendar("persian"), "Persian Calendar");
  assert.equal(new Cosmo("en_AU").calendar("buddhist"), "Buddhist Calendar");
  assert.equal(new Cosmo("fa").calendar("buddhist"), "تقویم بودایی");
  assert.equal(new Cosmo("fa").calendar(""), "");
});

test("currency name & symbol", () => {
  assert.equal(new Cosmo("en_AU").currency("aud"), "Australian Dollar");
  assert.equal(new Cosmo("en_AU").currency("aud", true), "$");
  // Standard (disambiguated) symbol, not the ambiguous narrow form: AUD in en-US is "A$", not "$".
  assert.equal(new Cosmo("en_US").currency("AUD", true), "A$");
  assert.equal(new Cosmo("en_AU", { currency: "AUD" }).currency(), "Australian Dollar");
  assert.equal(new Cosmo("en_AU").currency(""), "");
  assert.throws(() => new Cosmo("en_AU").currency("foo", false, true), CosmoError);
});

test("direction", () => {
  assert.equal(new Cosmo("fa").direction(), "rtl");
  assert.equal(new Cosmo("en").direction(), "ltr");
  assert.equal(new Cosmo("en_AU").direction(), "ltr");
});

test("flag", () => {
  assert.equal(new Cosmo("en_AU").flag(), "🇦🇺");
  assert.equal(new Cosmo("en").flag("us"), "🇺🇸");
  assert.equal(new Cosmo("en").flag(), "");
});

test("number, percentage", () => {
  assert.equal(new Cosmo("en_AU").percentage(0.2), "20%");
  assert.equal(new Cosmo("en_US").number(123400.567), "123,400.567");
  assert.equal(new Cosmo("de").number(123400.567), "123.400,567");
});

test("money", () => {
  assert.equal(new Cosmo("en_AU").money(12.3, "AUD"), "$12.30");
  assert.equal(new Cosmo("en_US").money(12.3, "AUD"), "A$12.30");
  assert.equal(new Cosmo("en_AU").money(12.32342, "AUD"), "$12.32");
  assert.equal(new Cosmo("en_AU").money(12, "AUD", { precision: 0 }), "$12");
  assert.equal(new Cosmo("en_AU").money(12.62342, "AUD", { precision: 0 }), "$13");
  assert.equal(new Cosmo("en_AU", { currency: "AUD" }).money(12.3), "$12.30");
  // no currency available
  assert.equal(new Cosmo("en").money(12.3), "");
  assert.throws(() => new Cosmo("en").money(12.3, null, { strict: true }), CosmoError);
});

test("symbol", () => {
  assert.equal(new Cosmo("fa").symbol("decimal_separator"), "٫");
  assert.equal(new Cosmo("fa").symbol("grouping_separator"), "٬");
  assert.equal(new Cosmo("fa").symbol("percent"), "٪");
  assert.equal(new Cosmo("en").symbol("decimal"), ".");
  assert.equal(new Cosmo("en").symbol("group"), ",");
  assert.throws(() => new Cosmo("en").symbol("not_a_symbol"), CosmoError);
});

test("unit", () => {
  assert.equal(new Cosmo("en").unit("digital", "gigabyte", 2.19), "2.19 gigabytes");
  assert.equal(new Cosmo("en").unit("digital", "gigabyte", 2.19, "medium"), "2.19 GB");
  assert.equal(new Cosmo("en").unit("mass", "gram", 120), "120 grams");
  assert.equal(new Cosmo("tr").unit("temperature", "celsius", 26, "short"), "26 °C");
  assert.throws(() => new Cosmo("en").unit("length", "furlong", 1), CosmoError);
});

test("message", () => {
  assert.equal(new Cosmo("en").message("aa {b} {c} dd", { b: "bb", c: "cc" }), "aa bb cc dd");
  assert.equal(
    new Cosmo("en_US").message(
      "{0,number,integer} monkeys on {1,number,integer} trees make {2,number} monkeys per tree",
      [4560, 123, 4560 / 123],
    ),
    "4,560 monkeys on 123 trees make 37.073 monkeys per tree",
  );
  assert.equal(
    new Cosmo("de").message(
      "{0,number,integer} Affen auf {1,number,integer} Bäumen sind {2,number} Affen pro Baum",
      [4560, 123, 4560 / 123],
    ),
    "4.560 Affen auf 123 Bäumen sind 37,073 Affen pro Baum",
  );
  // plural & select
  assert.equal(
    new Cosmo("en").message("{0, plural, one {# item} other {# items}}", [1]),
    "1 item",
  );
  assert.equal(
    new Cosmo("en").message("{0, plural, one {# item} other {# items}}", [3]),
    "3 items",
  );
  assert.equal(
    new Cosmo("en").message("{g, select, female {she} male {he} other {they}}", { g: "female" }),
    "she",
  );
  // standalone helper export
  assert.equal(formatMessage("en", "{n, plural, one {one} other {many}}", { n: 5 }), "many");
});

test("duration", () => {
  assert.equal(new Cosmo("en_US").duration(1222060), "339:27:40");
  assert.equal(new Cosmo("en_US").duration(1222060, true), "339 hours, 27 minutes, 40 seconds");
});

test("moment / date / time", () => {
  const d = new Date("2020-02-02T00:00:00");
  assert.equal(new Cosmo("en_US").moment(d, "full", "full").startsWith("Sunday, February 2, 2020"), true);
  assert.equal(new Cosmo("en_US").date(d, "full"), "Sunday, February 2, 2020");
  assert.equal(new Cosmo("en_GB").date(d, "short"), "02/02/2020");
});

test("calendar & timezone modifiers", () => {
  const d = new Date(Date.UTC(2020, 0, 2, 9, 25, 30));
  const c = new Cosmo("fa-IR", { timeZone: "Asia/Tehran" });
  // Persian calendar is the locale default for fa-IR
  assert.match(c.date(d, "short"), /۱۳۹۸/);
  // force gregorian
  assert.match(new Cosmo("fa-IR", { timeZone: "Asia/Tehran" }).moment(d, "short", "none", "gregorian"), /۲۰۲۰/);
});

test("unicode extensions in locale", () => {
  const c = new Cosmo("fa-IR-u-nu-latn-ca-buddhist", { timeZone: "Asia/Tehran" });
  assert.equal(c.modifiers.calendar, "buddhist");
  // latn numbering → ascii digits
  assert.match(c.date(new Date(Date.UTC(2020, 0, 2)), "short"), /2563/);
});

test("fromSubtags & fromAcceptLanguage & cosmo helper", () => {
  assert.equal(Cosmo.fromSubtags({ language: "en", region: "AU" }).country(), "Australia");
  assert.equal(Cosmo.fromAcceptLanguage("fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7").subtags.language, "fr");
  assert.equal(cosmo("en").percentage(0.2), "20%");
});

// ── locale-driven additions ────────────────────────────────────────────────

test("compare & sort", () => {
  assert.equal(new Cosmo("en").compare("a", "b") < 0, true);
  assert.equal(new Cosmo("en").compare("b", "a") > 0, true);
  assert.equal(new Cosmo("en").compare("a", "a"), 0);
  // Swedish sorts ä after z
  assert.deepEqual(new Cosmo("sv").sort(["z", "ä", "a"]), ["a", "z", "ä"]);
  // key accessor
  assert.deepEqual(
    new Cosmo("en").sort([{ n: "Zoe" }, { n: "Amy" }], (x) => x.n).map((x) => x.n),
    ["Amy", "Zoe"],
  );
});

test("contains", () => {
  assert.equal(new Cosmo("en").contains("Café del Mar", "cafe"), true); // base: ignore case & accent
  assert.equal(new Cosmo("en").contains("Café", "cafe", "variant"), false); // exact
  assert.equal(new Cosmo("en").contains("hello", ""), true);
  assert.equal(new Cosmo("en").contains("hello", "xyz"), false);
});

test("splitWords & splitSentences", () => {
  assert.deepEqual(new Cosmo("en").splitWords("Hello, world! Foo."), ["Hello", "world", "Foo"]);
  assert.deepEqual(new Cosmo("en").splitSentences("Hello world. How are you? Fine!"), [
    "Hello world.",
    "How are you?",
    "Fine!",
  ]);
});

test("ellipsize", () => {
  assert.equal(new Cosmo("en").ellipsize("The quick brown fox jumps", 15), "The quick…");
  assert.equal(new Cosmo("en").ellipsize("Hi", 15), "Hi"); // already fits
});

test("pluralCategory", () => {
  assert.equal(new Cosmo("en").pluralCategory(1), "one");
  assert.equal(new Cosmo("en").pluralCategory(2), "other");
  assert.equal(new Cosmo("en").pluralCategory(2, true), "two"); // ordinal 2nd
  assert.equal(new Cosmo("en").pluralCategory(3, true), "few"); // ordinal 3rd
});

test("weekInfo", () => {
  const us = new Cosmo("en-US").weekInfo();
  assert.equal(us.firstDay, 7); // Sunday
  assert.deepEqual(us.weekend, [6, 7]);
  const ir = new Cosmo("fa-IR").weekInfo();
  assert.equal(ir.firstDay, 6); // Saturday
});

test("addLikelySubtags & removeLikelySubtags", () => {
  assert.equal(new Cosmo("en").addLikelySubtags().locale, "en-Latn-US");
  assert.equal(new Cosmo("en-Latn-US").removeLikelySubtags().locale, "en");
});

test("monthNames & weekdayNames", () => {
  assert.deepEqual(
    new Cosmo("en").monthNames("medium"),
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  );
  // Persian calendar is implied by the fa-IR locale; names are calendar-aligned
  assert.equal(new Cosmo("fa-IR").monthNames()[0], "فروردین");
  // Sunday-first weekday order
  assert.deepEqual(
    new Cosmo("en").weekdayNames("medium"),
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  );
});

test("timeZoneName", () => {
  const c = new Cosmo("en_AU", { timeZone: "Australia/Sydney" });
  assert.match(c.timeZoneName(), /Australian Eastern (Standard|Daylight) Time/);
  assert.match(c.timeZoneName("short"), /AE(S|D)T/);
});

test("upper & lower (locale-aware)", () => {
  assert.equal(new Cosmo("tr").upper("istanbul"), "İSTANBUL"); // Turkish dotted I
  assert.equal(new Cosmo("en").upper("istanbul"), "ISTANBUL");
  assert.equal(new Cosmo("tr").lower("İSTANBUL"), "istanbul");
});

test("relativeDuration & relativeDurationBetween", () => {
  assert.equal(new Cosmo("en").relativeDuration(-3, "day"), "3 days ago");
  assert.equal(new Cosmo("en").relativeDuration(2, "hour"), "in 2 hours");
  assert.equal(new Cosmo("en").relativeDuration(-1, "day", "auto"), "yesterday");
  const now = Date.now();
  assert.equal(new Cosmo("en").relativeDurationBetween(now + 2 * 3600 * 1000, now), "in 2 hours");
  assert.equal(new Cosmo("en").relativeDurationBetween(now - 90 * 1000, now), "1 minute ago");
  // explicit reference (not now): target vs an arbitrary base moment
  const base = new Date("2020-02-10T12:00:00Z");
  assert.equal(
    new Cosmo("en").relativeDurationBetween(new Date("2020-02-07T12:00:00Z"), base),
    "3 days ago",
  );
  assert.equal(
    new Cosmo("en").relativeDurationBetween(new Date("2020-02-15T12:00:00Z"), base),
    "in 5 days",
  );
});

test("join", () => {
  assert.equal(new Cosmo("en").join(["A", "B", "C"]), "A, B, and C");
  assert.equal(new Cosmo("en").join(["A", "B", "C"], "disjunction"), "A, B, or C");
});

test("compact, scientific & ranges", () => {
  assert.equal(new Cosmo("en").compact(1200), "1.2K");
  assert.equal(new Cosmo("en").compact(1_200_000, "long"), "1.2 million");
  // Full mantissa precision, matching ICU's #E0 pattern in the PHP/Python ports.
  assert.equal(new Cosmo("en").scientific(12345), "1.2345E4");
  assert.equal(new Cosmo("en").numberRange(3, 5), "3–5");
  // formatRange separates with ICU whitespace (thin/no-break spaces), so match loosely
  assert.match(new Cosmo("en").moneyRange(3, 5, "USD"), /^\$3\.00\s+–\s+\$5\.00$/);
  assert.equal(new Cosmo("en").moneyRange(3, 5), ""); // no currency
  assert.match(
    new Cosmo("en").dateRange(new Date("2020-02-02T00:00:00"), new Date("2020-02-05T00:00:00")),
    /^Feb 2\s+–\s+5, 2020$/,
  );
});
test("displayName", () => {
  assert.equal(new Cosmo("en").displayName("language", "fr"), "French");
  assert.equal(new Cosmo("en").displayName("region", "JP"), "Japan");
  assert.equal(new Cosmo("en").displayName("script", "Hans"), "Simplified");
  assert.equal(new Cosmo("en").displayName("calendar", "buddhist"), "Buddhist Calendar");
  assert.equal(new Cosmo("en").displayName("currency", "EUR"), "Euro");
  assert.throws(() => new Cosmo("en").displayName("nope" as never, "x"), CosmoError);
});

test("splitGraphemes", () => {
  assert.deepEqual(new Cosmo("en").splitGraphemes("a👩‍👧b"), ["a", "👩‍👧", "b"]);
  assert.deepEqual(new Cosmo("en").splitGraphemes(""), []);
});

test("supportedValues", () => {
  const tz = new Cosmo("en").supportedValues("timeZone");
  assert.ok(tz.includes("Australia/Sydney"));
  assert.ok(new Cosmo("en").supportedValues("calendar").includes("buddhist"));
  assert.ok(new Cosmo("en").supportedValues("currency").includes("EUR"));
});

test("duration (multi-unit parts)", () => {
  assert.equal(new Cosmo("en").duration({ hours: 3, minutes: 5 }, true), "3 hours, 5 minutes");
  assert.match(new Cosmo("en").duration({ days: 2, hours: 3 }), /2 days,\s*3 hr/);
  assert.equal(new Cosmo("en").duration(1221440), "339:17:20"); // scalar seconds unchanged
});

test("number rounding/grouping options", () => {
  assert.equal(new Cosmo("en").number(2.9, { roundingMode: "floor", maximumFractionDigits: 0 }), "2");
  assert.equal(new Cosmo("en").number(2.1, { roundingMode: "ceil", maximumFractionDigits: 0 }), "3");
  assert.equal(
    new Cosmo("en").number(1.23, { roundingIncrement: 5, minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    "1.25",
  );
  assert.equal(new Cosmo("en").number(12345, { useGrouping: false }), "12345");
  assert.equal(new Cosmo("en").money(9.991, "USD", { roundingMode: "ceil" }), "$10.00");
  assert.equal(new Cosmo("en").percentage(0.12349, 2, { roundingMode: "floor" }), "12.34%");
});

test("collation tailoring options", () => {
  assert.ok(new Cosmo("en").compare("item2", "item10", { numeric: true }) < 0);
  assert.deepEqual(
    new Cosmo("en").sort(["item10", "item2", "item1"], undefined, { numeric: true }),
    ["item1", "item2", "item10"],
  );
  assert.deepEqual(
    new Cosmo("en").sort(["b", "B", "a", "A"], undefined, { caseFirst: "upper" }),
    ["A", "a", "B", "b"],
  );
});
