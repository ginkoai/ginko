// Common utility functions
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[^\w\s-]/gi, '');
}

export function parseJSON<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}