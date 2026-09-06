import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InfoIcon } from "lucide-react";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";

async function UserDetails() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return JSON.stringify(data.claims, null, 2);
}

export default function ProtectedPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-muted p-4 rounded-xl border border-border text-sm text-foreground flex gap-3 items-center">
          <InfoIcon size="16" className="text-muted-foreground" />
          <span>
            This is a protected page that is only accessible to authenticated
            users.
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 items-start">
        <h2 className="font-bold text-xl text-foreground mb-2">
          User Claims / Details
        </h2>
        <pre className="w-full text-xs font-mono p-4 rounded-xl border border-border bg-card text-card-foreground max-h-64 overflow-auto">
          <Suspense fallback={<Spinner size="sm" />}>
            <UserDetails />
          </Suspense>
        </pre>
      </div>
    </div>
  );
}
