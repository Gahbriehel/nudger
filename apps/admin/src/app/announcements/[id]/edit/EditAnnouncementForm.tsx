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
import { ArrowLeft, Edit3, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function EditAnnouncementForm({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = React.use(params);
  const id = unwrappedParams.id;
  const router = useRouter();

  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [isActive, setIsActive] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    async function loadItem() {
      if (!id) return;
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .eq("id", id)
          .single();

        if (error || !data) {
          toast.error("Announcement not found");
          router.push("/");
          return;
        }

        setTitle(data.title);
        setContent(data.content);
        setIsActive(data.is_active);
      } catch {
        toast.error("Failed to fetch announcement");
      } finally {
        setLoading(false);
      }
    }

    loadItem();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in both the title and content.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("announcements")
        .update({
          title: title.trim(),
          content: content.trim(),
          is_active: isActive,
        })
        .eq("id", id);

      if (error) {
        toast.error("Failed to update: " + error.message);
        return;
      }

      toast.success("Announcement updated successfully!");
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update announcement",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading announcement...</span>
      </div>
    );
  }

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
            <Edit3 className="h-5 w-5" />
            <CardTitle>Edit Announcement</CardTitle>
          </div>
          <CardDescription>
            Update the title, message, or visibility status of this
            announcement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Announcement Message</Label>
              <Textarea
                id="content"
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
                  Active Announcement
                </Label>
                <p className="text-xs text-muted-foreground">
                  When active, users will see this modal when visiting the
                  application.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link href="/">
                <Button variant="outline" type="button" disabled={saving}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
