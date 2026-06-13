"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";

function SignUpSuccessContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

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
          Thank you for signing up! Please click the confirmation link in the
          email to activate your account.
        </p>

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
    <Suspense
      fallback={
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
          <Spinner size="md" label="Loading success screen..." />
        </div>
      }
    >
      <SignUpSuccessContent />
    </Suspense>
  );
}
