import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-6">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Access Denied</h1>
      <p className="text-muted-foreground max-w-md mb-6 text-sm">
        You do not have administrative privileges to access this console. If you
        believe this is an error, please contact your database administrator to
        assign the{" "}
        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
          admin
        </code>{" "}
        role to your account.
      </p>
      <div className="flex gap-4">
        <form action="/auth/signout" method="post">
          <Button variant="outline" type="submit">
            Sign In with Different Account
          </Button>
        </form>
      </div>
    </div>
  );
}
