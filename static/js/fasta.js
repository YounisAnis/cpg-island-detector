export function lengths(text) {
  const rows = text.split(/\r?\n/);
  const sizes = [];
  for (const row of rows) {
    if (row.trimStart().startsWith(">")) sizes.push(0);
    else if (row.trim()) {
      if (!sizes.length) sizes.push(0);
      sizes[sizes.length - 1] += row.replace(/\s/g, "").length;
    }
  }
  return sizes;
}
