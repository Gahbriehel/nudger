"use client";

import * as React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Announcement } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, Trash2, Edit3, Power, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AnnouncementsDashboard() {
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(
    null,
  );

  const fetchAnnouncements = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to fetch announcements: " + error.message);
        return;
      }

      setAnnouncements(data || []);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load announcements",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const toggleStatus = async (item: Announcement) => {
    setActionLoadingId(item.id);
    const newStatus = !item.is_active;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("announcements")
        .update({ is_active: newStatus })
        .eq("id", item.id);

      if (error) {
        toast.error("Failed to update status: " + error.message);
        return;
      }

      toast.success(
        newStatus ? `Announcement activated!` : `Announcement deactivated!`,
      );
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === item.id ? { ...a, is_active: newStatus } : a,
        ),
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error toggling status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    setActionLoadingId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) {
        toast.error("Failed to delete: " + error.message);
        return;
      }

      toast.success("Announcement deleted");
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error deleting announcement",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            Manage global announcements displayed to active users across the
            platform.
          </p>
        </div>
        <Link href="/announcements/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>New Announcement</span>
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading announcements...</span>
        </div>
      ) : announcements.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
              <Megaphone className="w-6 h-6" />
            </div>
            <CardTitle className="text-lg mb-1">No announcements yet</CardTitle>
            <CardDescription className="max-w-sm mb-6">
              Create your first announcement to broadcast updates, news, or
              maintenance notes to your users.
            </CardDescription>
            <Link href="/announcements/new">
              <Button size="sm">Create Announcement</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {announcements.map((item) => (
            <Card
              key={item.id}
              className="transition-all hover:border-border/80"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <Badge variant={item.is_active ? "default" : "secondary"}>
                        {item.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Created {new Date(item.created_at).toLocaleDateString()}{" "}
                      at{" "}
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={item.is_active ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleStatus(item)}
                      disabled={actionLoadingId === item.id}
                      className="h-8 text-xs flex items-center gap-1.5"
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>{item.is_active ? "Deactivate" : "Activate"}</span>
                    </Button>
                    <Link href={`/announcements/${item.id}/edit`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAnnouncement(item.id)}
                      disabled={actionLoadingId === item.id}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {item.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
