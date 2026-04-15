/**
 * @nxtstps/types — public API boundary types.
 *
 * Consumed by apps/web and future apps/mobile. Internal server-only types
 * (DB row shapes, Supabase query results) stay in their originating modules.
 *
 * Phase strategy: the declarations still live in the web app; this package
 * re-exports them so cross-app consumers have a single stable import path.
 * A later prompt will lift the canonical declarations into this package.
 */

export * from "./matching";
export * from "./search";
export * from "./intake";
export * from "./ai";
export * from "./knowledge";
export * from "./providers";
export * from "./denial";
