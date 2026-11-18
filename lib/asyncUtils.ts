/**
 * Small helper that keeps auth/session work from blocking navigation forever.
 * If the work finishes first, the timeout is cleared and has no effect.
 */
export function withTimeout<T>(
  work: Promise<T> | (() => Promise<T>),
  ms: number,
  message = 'Operation timed out',
): Promise<T> {
  const promise = typeof work === 'function' ? work() : work;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
