-- Optional YouTube links only; video files remain hosted on YouTube.
-- Additive and safe to rerun. Existing products and access policies are preserved.
alter table public.market_products
  add column if not exists youtube_url text
  check (youtube_url is null or youtube_url ~ '^https://www[.]youtube[.]com/watch[?]v=[A-Za-z0-9_-]{11}$');
notify pgrst, 'reload schema';
