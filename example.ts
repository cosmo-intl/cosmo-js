import { Cosmo } from "./dist/index.js";

const localesTimeZones: Array<[string, string]> = [
  ["en_AU", "Australia/Sydney"],
  ["en_GB", "Europe/London"],
  ["de_DE", "Europe/Berlin"],
  ["zh_CN", "Asia/Chongqing"],
  ["fa-IR", "Asia/Tehran"],
  // overwrite the numbering system to `latn` and calendar to `buddhist`
  ["fa-IR-u-nu-latn-ca-buddhist", "Asia/Tehran"],
  ["hi_IN", "Asia/Jayapura"],
  ["ar_EG", "Africa/Cairo"],
];

const time = new Date(Date.UTC(2020, 0, 2, 9, 25, 30));

for (const [locale, timeZone] of localesTimeZones) {
  // currency must be explicit (no region→currency table is bundled — see README)
  const currencyByRegion: Record<string, string> = {
    AU: "AUD", GB: "GBP", DE: "EUR", CN: "CNY", IR: "IRR", IN: "INR", EG: "EGP",
  };
  const cosmo = new Cosmo(locale, { timeZone });
  const currency = currencyByRegion[cosmo.subtags.region] ?? "USD";

  console.log(`${cosmo.flag()} ${cosmo.country()} - ${cosmo.language()} (${locale})`);
  console.log("=================================================");
  console.log("Language direction: " + cosmo.direction());
  console.log(cosmo.number(123400.567));
  console.log(cosmo.percentage(0.14));
  console.log(cosmo.money(12.3, currency));
  console.log(cosmo.currency(currency));
  console.log(cosmo.unit("digital", "gigabyte", 2.19));
  console.log(cosmo.unit("digital", "gigabyte", 2.19, "medium"));
  console.log(cosmo.unit("mass", "gram", 120));
  console.log(cosmo.duration(1222060, true));
  console.log(cosmo.moment(time)); // date and time
  console.log(cosmo.time(time, "full"));
  console.log(cosmo.date(time, "full"));
  // locale-driven utilities
  console.log(cosmo.relativeDurationBetween(Date.now() + 2 * 3600 * 1000));
  console.log(cosmo.compact(1_200_000, "long"));
  console.log(cosmo.join([cosmo.country(), cosmo.language()]));
  console.log(cosmo.monthNames("medium").slice(0, 3).join(", "));
  console.log(cosmo.timeZoneName());
  console.log("");
}