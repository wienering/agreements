/**
 * Development-only logger. No-ops in production to avoid leaking info to logs.
 */
export function devLog(...args: unknown[]) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
}
