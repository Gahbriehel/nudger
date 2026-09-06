"use client";

import * as React from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [checkingAuth, setCheckingAuth] = React.useState(true);

  React.useEffect(() => {
    // If the admin is already authenticated, redirect straight to dashboard
    const checkActiveSession = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .maybeSingle();

          if (roleData?.role === "admin") {
            window.location.href = "/";
            return;
          }
        }
      } catch {
        // Ignore session check errors on login mount
      } finally {
        setCheckingAuth(false);
      }
    };

    checkActiveSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      // Check if user is an admin
      if (data.user) {
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (roleError || roleData?.role !== "admin") {
          toast.error("You do not have administrator permissions.");
          window.location.href = "/unauthorized";
          return;
        }
      }

      toast.success("Welcome back, admin!");
      // Use full page load to bypass Next.js App Router client-side cache
      // and ensure the middleware processes the fresh session cookie.
      window.location.href = "/";
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to sign in");
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-md border border-border bg-card shadow-lg">
        <CardHeader className="text-center space-y-3 pb-6">
          <div className="mx-auto flex items-center justify-center pt-2">
            <Image
              width={140}
              height={36}
              src="/images/nudger-logo-black.svg"
              alt="Nudger"
              className="dark:hidden block h-8 w-auto"
              priority
            />
            <Image
              width={140}
              height={36}
              src="/images/nudger-logo-white.svg"
              alt="Nudger"
              className="hidden dark:block h-8 w-auto"
              priority
            />
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Admin Authentication</CardTitle>
            </div>
            <CardDescription>
              Sign in with an authorized administrator account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In to Admin"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
