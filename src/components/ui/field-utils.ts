export function fieldA11yProps(id: string, error?: string, hasDescription = false) {
  const descriptionId = hasDescription ? `${id}-description` : null;
  const errorId = error ? `${id}-error` : null;
  return {
    "aria-invalid": Boolean(error),
    "aria-describedby": [descriptionId, errorId].filter(Boolean).join(" ") || undefined,
  };
}
