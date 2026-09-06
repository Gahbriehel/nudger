"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Megaphone } from "lucide-react";
import { toast } from "sonner";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in both the title and content.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("announcements").insert({
        title: title.trim(),
        content: content.trim(),
        is_active: isActive,
        created_by: user?.id || null,
      });

      if (error) {
        toast.error("Failed to create announcement: " + error.message);
        return;
      }

      toast.success("Announcement published successfully!");
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Announcements</span>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Megaphone className="h-5 w-5" />
            <CardTitle>Create Announcement</CardTitle>
          </div>
          <CardDescription>
            Publish a new announcement for users. If marked active, it will
            display as a pop-up modal upon next visit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Scheduled Maintenance or New Feature Release"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Announcement Message</Label>
              <Textarea
                id="content"
                placeholder="Write your announcement details here..."
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <input
                id="is_active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div className="space-y-0.5 text-sm">
                <Label
                  htmlFor="is_active"
                  className="font-medium cursor-pointer"
                >
                  Activate immediately
                </Label>
                <p className="text-xs text-muted-foreground">
                  If checked, the announcement will be immediately shown to
                  users who haven&apos;t dismissed it.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link href="/">
                <Button variant="outline" type="button" disabled={loading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? "Publishing..." : "Publish Announcement"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
