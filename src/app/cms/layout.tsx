import { getPayload } from "payload";
import config from "@/payload/payload.config";
import { Sidebar } from "@/components/cms/sidebar";
import { TourProvider } from "@/components/tour";

export const dynamic = "force-dynamic";

async function getSites() {
  const payload = await getPayload({ config });
  const result = await payload.find({ collection: "sites", limit: 50, sort: "name" });
  return result.docs.map((s) => {
    const site = (s as unknown) as {
      id: string | number;
      name: string;
      githubRepo: string;
      framework: string;
    };
    return { id: site.id, name: site.name, githubRepo: site.githubRepo, framework: site.framework };
  });
}

export default async function CMSLayout({ children }: { children: React.ReactNode }) {
  const sites = await getSites();

  return (
    <TourProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar sites={sites} />
        <div className="flex-1 overflow-auto flex flex-col min-w-0">
          {children}
        </div>
      </div>
    </TourProvider>
  );
}
