import { useEffect } from "react";

type MetaTag = { name: string; content: string } | { property: string; content: string };

// Client-side replacement for per-route `head()`: sets the title and upserts meta tags on mount.
export function usePageMeta(title: string, meta: MetaTag[] = []) {
  useEffect(() => {
    document.title = title;
    for (const tag of meta) {
      const [attr, key] = "name" in tag ? ["name", tag.name] : ["property", tag.property];
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = tag.content;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, JSON.stringify(meta)]);
}
