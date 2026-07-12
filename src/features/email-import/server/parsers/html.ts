// Minimal HTML → text conversion for bank notification emails. Deliberately simple:
// notification emails are table/paragraph layouts, and the parsers only need the visible
// text with line breaks preserved.
export function stripHtml(html: string) {
  return html
    .replace(/<(?:style|script)[^>]*>[\s\S]*?<\/(?:style|script)>/gi, " ")
    .replace(/<(?:br|\/p|\/div|\/tr|\/li|\/h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
