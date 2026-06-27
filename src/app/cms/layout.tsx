import { getAllSites } from "@/lib/sites-store";
import { Sidebar } from "@/components/cms/sidebar";
import { TourProvider } from "@/components/tour";

export const dynamic = "force-dynamic";

export default function CMSLayout({ children }: { children: React.ReactNode }) {
  const sites = getAllSites().map((s) => ({
    id: s.id,
    name: s.name,
    githubRepo: s.githubRepo ?? s.wpUrl ?? "",
    framework: s.framework,
  }));

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
