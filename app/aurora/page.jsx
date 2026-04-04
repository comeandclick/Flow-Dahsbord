import AppCrashGuard from "../flow/AppCrashGuard";
import FlowApp from "../FlowApp";

export default function AuroraPage() {
  return (
    <AppCrashGuard>
      <FlowApp siteSkin="aurora" />
    </AppCrashGuard>
  );
}
