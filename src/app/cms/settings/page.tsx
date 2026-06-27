import { AISettingsForm } from "./ai-settings-form";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">AI Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your AI provider and paste in an API key. Keys are stored in Payload and never sent to the browser.
        </p>
      </div>
      <AISettingsForm />
    </div>
  );
}
