/** White-label brand settings stored in profiles.brand_settings JSONB */
export interface BrandSettings {
  brandName: string;
  brandColor: string; // hex, e.g. "#7850DC"
  logoUrl: string | null; // Supabase Storage public URL
}

export const DEFAULT_BRAND: BrandSettings = {
  brandName: "Lumora",
  brandColor: "#0f172a",
  logoUrl: null,
};
