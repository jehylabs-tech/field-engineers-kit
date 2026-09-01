import { slugifyHeading } from "@/lib/blog/slugify";
import type { TocItem } from "@/lib/blog/types";

export function extractTableOfContents(source: string): TocItem[] {
  const items: TocItem[] = [];

  for (const line of source.split("\n")) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      const text = h2[1].trim();
      items.push({ level: 2, text, id: slugifyHeading(text) });
      continue;
    }

    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      const text = h3[1].trim();
      items.push({ level: 3, text, id: slugifyHeading(text) });
    }
  }

  return items;
}
