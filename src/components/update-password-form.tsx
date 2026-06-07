"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, zodResolver } from "@/lib/react-hook-form";
import { z, infer as zInfer } from "@/lib/zod";
import { authService } from "@/services/auth.service";

const updatePasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
});

type UpdatePasswordInput = zInfer<typeof updatePasswordSchema>;

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordInput>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    resolver: zodResolver(updatePasswordSchema),
  });

  const onSubmit = async (data: UpdatePasswordInput) => {
    setError(null);
    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      await authService.updatePassword(data.password);
      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border border-border bg-card backdrop-blur-md shadow-lg text-foreground">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">Update Password</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-md p-4">
              Password updated successfully! Redirecting you to your dashboard...
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-sm font-medium">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...register("password")}
                    className={cn(
                      errors.password && "border-destructive/50"
                    )}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    {...register("confirmPassword")}
                    className={cn(
                      errors.confirmPassword && "border-destructive/50"
                    )}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md p-3">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all py-2 rounded-md"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Updating password..." : "Update Password"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
