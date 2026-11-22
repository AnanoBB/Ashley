/** Escapes text so it matches literally inside a RegExp, e.g. "Twin (XL)". */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
