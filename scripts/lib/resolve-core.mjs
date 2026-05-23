/**
 * Apply a flat { key: chosenValue } map onto a nested yaml object.
 * Pure — returns a new object, does not mutate the input.
 */
export function applyChoices(yaml, choices) {
  const clone = structuredClone(yaml);
  for (const [key, value] of Object.entries(choices)) {
    const parts = key.split(".");
    let cursor = clone;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const p = parts[i];
      if (cursor[p] === undefined || typeof cursor[p] !== "object" || Array.isArray(cursor[p])) {
        cursor[p] = {};
      }
      cursor = cursor[p];
    }
    cursor[parts[parts.length - 1]] = value;
  }
  return clone;
}
