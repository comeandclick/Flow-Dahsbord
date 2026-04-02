import AppCrashGuard from "./flow/AppCrashGuard";
import FlowApp from "./FlowApp";

export default function Page() {
  return (
    <AppCrashGuard>
      <FlowApp />
    </AppCrashGuard>
  );
}
