import type { BlogBodyProps } from "@/lib/blocks/schemas";

export function BlogBodyBlock({ props }: { props: BlogBodyProps }) {
  const { content } = props;

  return (
    <section className="w-full py-8">
      <div className="container mx-auto px-4">
        <div
          className="mx-auto max-w-prose prose prose-neutral dark:prose-invert prose-headings:font-bold prose-a:text-primary prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </section>
  );
}
