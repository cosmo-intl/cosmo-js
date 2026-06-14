import { Cosmo, type Modifiers } from "./cosmo.js";

/**
 * Convenience factory for constructing a {@link Cosmo} instance.
 * @example cosmo("en").percentage(0.2) // "20%"
 */
export function cosmo(locale?: string | null, modifiers: Modifiers = {}): Cosmo {
  return new Cosmo(locale, modifiers);
}
