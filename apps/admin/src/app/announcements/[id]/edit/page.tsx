import * as React from "react";
import { EditAnnouncementForm } from "./EditAnnouncementForm";
import { Loader2 } from "lucide-react";

export default function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading...</span>
        </div>
      }
    >
      <EditAnnouncementForm params={params} />
    </React.Suspense>
  );
}
