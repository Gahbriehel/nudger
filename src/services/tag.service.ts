import { createClient } from "@/lib/supabase/client";
import { Tag } from "@/types/database.types";

const supabase = createClient();

export const tagService = {
  async getTags(): Promise<Tag[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated");

    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createTag(name: string): Promise<Tag> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated");

    const cleanName = name.trim().toLowerCase();

    // Check if tag already exists
    const { data: existingTag } = await supabase
      .from("tags")
      .select()
      .eq("user_id", user.id)
      .eq("name", cleanName)
      .maybeSingle();

    if (existingTag) return existingTag;

    const { data, error } = await supabase
      .from("tags")
      .insert({ user_id: user.id, name: cleanName })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTag(id: string): Promise<void> {
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) throw error;
  },
};
