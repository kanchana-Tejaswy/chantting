import { AppShell } from "@/components/layout/app-shell";
import { DesignSystemShowcase } from "@/components/design-system/design-system-showcase";

export default function DesignSystemPage() {
  return (
    <AppShell pageTitle="Design System">
      <DesignSystemShowcase />
    </AppShell>
  );
}

