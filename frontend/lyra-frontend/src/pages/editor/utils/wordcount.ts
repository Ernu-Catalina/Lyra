export function countWords(text: string): number {
  if (!text.trim()) return 0;

  const plain = text
    .replace(/<[^>]+>/g, " ")           
    .replace(/\s+/g, " ")              
    .trim();

  if (!plain) return 0;

  return plain.split(" ").filter(Boolean).length;
}

export function formatWordCount(count: number, format: string): string {
  if (count === 0) return "0";

  switch (format) {
    case "exact":
      return count.toString();

    case "exact_separated":
      return count.toLocaleString("en-US");

    case "rounded_up":
      if (count < 1000) return count.toString();
      const k = Math.ceil(count / 100) / 10;
      return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;

    case "truncated":
      if (count < 1000) return count.toString();
      const t = Math.floor(count / 100) / 10;
      return t % 1 === 0 ? `${t}K` : `${t.toFixed(1)}K`;

    case "thousands_rounded_up":
      return Math.ceil(count / 1000).toString() + "K";

    case "thousands_truncated":
      return Math.floor(count / 1000).toString() + "K";

    default:
      return count.toString();
  }
}

export function countWordsFromHtml(html: string): number {
  // your existing implementation
  return countWords(html);
}

export function estimateWordDelta(
  previous: string,
  current: string
): number {
  return countWordsFromHtml(current) - countWordsFromHtml(previous);
}