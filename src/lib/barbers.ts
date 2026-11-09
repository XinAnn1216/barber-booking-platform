import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { sortSlots, type SlotWindow } from "@/lib/booking";

export const PHOTO_BUCKET = "barber-photos";

export type Barber = Tables<"barbers">;
export type Service = Tables<"services">;
export type Photo = Tables<"barber_photos">;

export const photoUrl = (path: string) =>
  supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;

/** Featured photos first, then the shop's own sort order, then oldest first. */
export function orderPhotos<T extends Pick<Photo, "is_featured" | "sort_order" | "created_at">>(
  photos: T[],
): T[] {
  return [...photos].sort(
    (a, b) =>
      Number(b.is_featured) - Number(a.is_featured) ||
      a.sort_order - b.sort_order ||
      Date.parse(a.created_at) - Date.parse(b.created_at),
  );
}

/** Card photo: first featured photo, else the newest one, else none. */
export function repPhoto<T extends Pick<Photo, "is_featured" | "sort_order" | "created_at">>(
  photos: T[],
): T | undefined {
  const featured = orderPhotos(photos.filter((p) => p.is_featured))[0];
  if (featured) return featured;
  return [...photos].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
}

/**
 * Future slots of a barber that no booking holds. The anti-join runs in the database:
 * the left-embedded booking_slots must be null (NOT EXISTS a booking_slots row).
 */
export async function fetchFreeSlots(barberId: string): Promise<SlotWindow[]> {
  const { data, error } = await supabase
    .from("bookable_slots")
    .select("id, starts_at, ends_at, booking_slots(slot_id)")
    .eq("barber_id", barberId)
    .gt("starts_at", new Date().toISOString())
    .is("booking_slots", null)
    .order("starts_at");
  if (error) throw error;
  return sortSlots((data ?? []).map(({ id, starts_at, ends_at }) => ({ id, starts_at, ends_at })));
}
