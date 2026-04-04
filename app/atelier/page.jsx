import AppCrashGuard from "../flow/AppCrashGuard";
import FlowApp from "../FlowApp";

export default function AtelierPage() {
  return (
    <AppCrashGuard>
      <FlowApp siteSkin="atelier" />
    </AppCrashGuard>
  );
}
