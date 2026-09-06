import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;
  const isPkceError =
    params?.error &&
    (params.error.toLowerCase().includes("pkce") ||
      params.error.toLowerCase().includes("verifier"));

  if (isPkceError) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          This usually happens when you click the confirmation link in a
          different browser, app, or device than the one you used to sign up.
        </p>
        <p className="text-sm font-medium text-foreground">
          Good news! Your email has likely already been verified. Please try
          logging in with the email and password you created.
        </p>
        <Button asChild className="w-full mt-2">
          <Link href="/auth/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {params?.error ? (
        <p className="text-sm text-muted-foreground">
          Code error: {params.error}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          An unspecified error occurred.
        </p>
      )}
      <Button asChild variant="outline" className="w-full mt-2">
        <Link href="/auth/login">Back to Login</Link>
      </Button>
    </div>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card className="border border-border bg-card backdrop-blur-md shadow-lg text-foreground">
            <CardHeader>
              <CardTitle className="text-2xl font-bold tracking-tight">
                Sorry, something went wrong.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense>
                <ErrorContent searchParams={searchParams} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
