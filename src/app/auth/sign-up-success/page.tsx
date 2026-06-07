import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card className="border border-border bg-card backdrop-blur-md shadow-lg text-foreground">
            <CardHeader>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Check your email
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                We&apos;ve sent you a confirmation link.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Thank you for signing up! Please click the confirmation link in the email we sent to your address to activate your account.
              </p>
              <Link
                href="/auth/login"
                className="w-full text-center bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all py-2 rounded-md text-sm"
              >
                Back to Login
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
