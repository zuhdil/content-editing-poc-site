import { content, renderMarkdown } from "@/content/loader";

export default function AboutPage() {
  return (
    <main>
      <h1>{content.about.heading}</h1>
      <p>{content.about.intro}</p>
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content.about.mission_body) }} />
    </main>
  );
}
