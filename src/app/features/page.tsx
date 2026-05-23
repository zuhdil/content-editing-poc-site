import { content, renderMarkdown } from "@/content/loader";

export default function FeaturesPage() {
  return (
    <main>
      <h1>{content.features.heading}</h1>
      <p>{content.features.subtitle}</p>
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content.features.footer_note) }} />
    </main>
  );
}
