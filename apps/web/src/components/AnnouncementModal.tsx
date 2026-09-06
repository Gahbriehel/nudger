"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { Announcement } from "@/types/database.types";
import { Megaphone } from "lucide-react";

export function AnnouncementModal() {
  const [announcement, setAnnouncement] = React.useState<Announcement | null>(
    null,
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [isDismissing, setIsDismissing] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    async function checkAnnouncement() {
      try {
        const supabase = createClient();

        // 1. Fetch latest active announcement
        const { data: activeList, error: fetchErr } = await supabase
          .from("announcements")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1);

        if (fetchErr || !activeList || activeList.length === 0) {
          return;
        }

        const activeItem = activeList[0] as Announcement;

        // 2. Check local storage first for quick dismissal check
        const localDismissed = localStorage.getItem(
          `dismissed_announcement_${activeItem.id}`,
        );
        if (localDismissed === "true") {
          return;
        }

        // 3. Check DB if user is authenticated
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: dismissedRecord } = await supabase
            .from("user_announcements")
            .select("announcement_id")
            .eq("user_id", user.id)
            .eq("announcement_id", activeItem.id)
            .maybeSingle();

          if (dismissedRecord) {
            // User already dismissed on another device
            localStorage.setItem(
              `dismissed_announcement_${activeItem.id}`,
              "true",
            );
            return;
          }
        }

        if (isMounted) {
          setAnnouncement(activeItem);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Failed to load announcement:", err);
      }
    }

    checkAnnouncement();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = async () => {
    if (!announcement) return;
    setIsDismissing(true);

    try {
      // 1. Mark in localStorage immediately
      localStorage.setItem(`dismissed_announcement_${announcement.id}`, "true");

      // 2. If authenticated, mark in database
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("user_announcements").insert({
          user_id: user.id,
          announcement_id: announcement.id,
        });
      }

      setIsOpen(false);
    } catch (err) {
      console.error("Failed to record announcement dismissal:", err);
      setIsOpen(false);
    } finally {
      setIsDismissing(false);
    }
  };

  if (!announcement || !isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleDismiss}
      title={
        <div className="flex items-center justify-center gap-2 text-primary">
          <Megaphone className="w-5 h-5" />
          <span>{announcement.title}</span>
        </div>
      }
      variant="default"
      confirmText="Got it"
      cancelText="Close"
      onConfirm={handleDismiss}
      isLoading={isDismissing}
    >
      <div className="py-2 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto px-1">
        {announcement.content}
      </div>
    </Modal>
  );
}
