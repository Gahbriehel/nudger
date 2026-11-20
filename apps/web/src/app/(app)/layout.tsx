import { AuthenticatedLayout } from "@/components/dashboard/AuthenticatedLayout";

// Shared shell for all signed-in routes. Living in a layout (instead of being
// wrapped by each page) means it mounts once and persists across tab switches,
// so session sync, task fetching and prompts don't re-run on every navigation.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
