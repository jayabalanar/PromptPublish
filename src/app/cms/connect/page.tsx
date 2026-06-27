import type { Metadata } from "next";
import { ConnectSiteForm } from "./connect-form";

export const metadata: Metadata = { title: "Connect Site — PromptPublish" };

export default function ConnectPage() {
  return (
    <div className="p-8 max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Connect a site</h1>
        <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
          Add a GitHub repository to start editing its pages with AI prompts.
        </p>
      </div>
      <ConnectSiteForm />
    </div>
  );
}
