/**
 * Base error for everything Cosmo throws. Catch this to handle any
 * library error; catch a subclass to distinguish the cause.
 */
export class CosmoError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CosmoError";
  }
}

/**
 * A caller passed an invalid argument — a typo'd option key, an unknown currency
 * code, an unsupported width/unit, a bad enum value, … This signals a bug to fix
 * in the calling code, not a condition to catch and recover from.
 */
export class InvalidArgumentError extends CosmoError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "InvalidArgumentError";
  }
}

/**
 * The runtime lacks an `Intl` capability the operation needs (e.g.
 * `Intl.DurationFormat` on Node < 22). This is environmental — reasonable to
 * catch and degrade gracefully.
 */
export class UnsupportedError extends CosmoError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "UnsupportedError";
  }
}
