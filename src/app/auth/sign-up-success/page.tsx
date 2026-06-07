"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function SignUpSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");
  const [pastedInput, setPastedInput] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (!pastedInput.trim()) {
      toast.error("Please enter a verification link or token hash.");
      return;
    }

    setVerifying(true);
    try {
      let tokenHash = pastedInput.trim();
      let verifyType: any = "signup";

      // Attempt to parse as URL
      try {
        if (tokenHash.startsWith("http://") || tokenHash.startsWith("https://") || tokenHash.includes("token_hash=")) {
          // If they just copied the path without protocol (e.g. localhost:3000/auth/confirm?token_hash=...)
          let urlString = tokenHash;
          if (!tokenHash.startsWith("http://") && !tokenHash.startsWith("https://")) {
            urlString = "http://" + tokenHash;
          }
          const parsedUrl = new URL(urlString);
          const hashParam = parsedUrl.searchParams.get("token_hash");
          const typeParam = parsedUrl.searchParams.get("type");

          if (hashParam) {
            tokenHash = hashParam;
          }
          if (typeParam) {
            verifyType = typeParam;
          }
        }
      } catch (e) {
        // Treat the whole input as the token_hash if URL parsing fails
      }

      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: verifyType,
      });

      if (error) {
        throw error;
      }

      toast.success("Email verified successfully! Welcome to DoIt.");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Verification failed. Please check the code/link and try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card className="border border-border bg-card backdrop-blur-md shadow-lg text-foreground w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Check your email
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          We&apos;ve sent you a confirmation link{email ? ` to ${email}` : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Thank you for signing up! Please click the confirmation link in the email to activate your account.
        </p>

        <div className="border-t border-border pt-5 space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500">
              Localhost Redirect Workaround
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If clicking the email link redirected you to a broken <strong>localhost</strong> page, copy that broken page&apos;s URL (or the token hash) and paste it below to confirm your account directly from here:
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Paste localhost link or token_hash here..."
              value={pastedInput}
              onChange={(e) => setPastedInput(e.target.value)}
              className="text-xs bg-background/50"
            />
            <Button
              onClick={handleVerify}
              disabled={verifying}
              className="w-full bg-amber-600 hover:bg-amber-600/90 text-white font-semibold text-xs py-2 h-9 rounded-md transition-all flex items-center justify-center"
            >
              {verifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Verify & Sign In"
              )}
            </Button>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <Link
            href="/auth/login"
            className="w-full text-center bg-muted hover:bg-muted/80 text-foreground font-semibold transition-all py-2 rounded-md text-sm block"
          >
            Back to Login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="text-sm text-muted-foreground">Loading signup success...</div>
      </div>
    }>
      <SignUpSuccessContent />
    </Suspense>
  );
}
