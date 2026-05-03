-- Add missing columns to productions table
alter table public.productions
  add column if not exists description text,
  add column if not exists platforms    text[];
