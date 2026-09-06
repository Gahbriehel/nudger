export interface Announcement {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  user_id: string;
  role: "admin" | "user";
  created_at: string;
}

export interface UserAnnouncement {
  user_id: string;
  announcement_id: string;
  dismissed_at: string;
}

export type Database = {
  public: {
    Tables: {
      user_roles: {
        Row: UserRole;
        Insert: Omit<UserRole, "created_at"> & { created_at?: string };
        Update: Partial<UserRole>;
      };
      announcements: {
        Row: Announcement;
        Insert: Omit<Announcement, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Announcement>;
      };
      user_announcements: {
        Row: UserAnnouncement;
        Insert: Omit<UserAnnouncement, "dismissed_at"> & {
          dismissed_at?: string;
        };
        Update: Partial<UserAnnouncement>;
      };
    };
  };
};
