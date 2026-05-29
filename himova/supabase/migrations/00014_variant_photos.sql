-- Himova 00014: per-variant photos
--
-- Allow a product photo to optionally belong to a specific variant (colour /
-- style). Photos with variant_id = NULL are "general" product photos shown by
-- default; photos with a variant_id are shown when the shopkeeper selects that
-- variant on the product detail page.
--
-- on delete set null: if a variant is removed, its photos fall back to being
-- general product photos rather than disappearing.

alter table public.product_photos
  add column if not exists variant_id uuid
  references public.product_variants(id) on delete set null;

create index if not exists product_photos_variant_idx
  on public.product_photos (variant_id);
