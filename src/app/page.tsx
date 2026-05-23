import { content, renderMarkdown } from "@/content/loader";

export default function HomePage() {
  return (
    <main>
      <h1>{content.home.hero.title}</h1>
      <p>{content.home.hero.subtitle}</p>

      <section style={{ marginTop: "2rem" }}>
        <h2>{content.home.feature_one.title}</h2>
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content.home.feature_one.description) }} />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>{content.home.feature_two.title}</h2>
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content.home.feature_two.description) }} />
      </section>

      <p style={{ marginTop: "2rem" }}>
        <a href="/content-editing-poc-site/about/" style={{ padding: "0.5rem 1rem", background: "#0070f3", color: "white", textDecoration: "none", borderRadius: 4 }}>
          {content.home.cta.button_label}
        </a>
      </p>
    </main>
  );
}
