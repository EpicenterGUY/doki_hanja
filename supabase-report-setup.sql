-- DOKI 漢字 비공개 오류 신고 수신함
-- Supabase SQL Editor에서 1회 실행합니다.
-- 실행 후 Authentication에서 개발자 계정을 만든 뒤,
-- 마지막 INSERT의 UUID를 해당 계정 UUID로 바꾸어 실행하세요.

create extension if not exists pgcrypto;

create table if not exists public.report_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category text not null default '기타',
  title text not null,
  description text not null,
  steps text not null default '',
  expected text not null default '',
  contact text not null default '',
  app_build text not null default '',
  app_mode text not null default '',
  page_url text not null default '',
  user_agent text not null default '',
  viewport text not null default '',
  attachment_paths jsonb not null default '[]'::jsonb,
  status text not null default 'new' check (status in ('new','checking','fixed','closed')),
  dev_note text not null default ''
);

create index if not exists bug_reports_created_at_idx
  on public.bug_reports(created_at desc);

alter table public.report_admins enable row level security;
alter table public.bug_reports enable row level security;

drop policy if exists "report_admins_self_read" on public.report_admins;
create policy "report_admins_self_read"
on public.report_admins
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "public_can_submit_bug_reports" on public.bug_reports;
create policy "public_can_submit_bug_reports"
on public.bug_reports
for insert
to anon, authenticated
with check (
  char_length(title) between 1 and 100
  and char_length(description) between 1 and 4000
  and char_length(steps) <= 3000
  and char_length(expected) <= 2000
  and char_length(contact) <= 200
  and jsonb_array_length(attachment_paths) <= 5
);

drop policy if exists "admins_can_read_bug_reports" on public.bug_reports;
create policy "admins_can_read_bug_reports"
on public.bug_reports
for select
to authenticated
using (
  exists (
    select 1 from public.report_admins a
    where a.user_id = auth.uid()
  )
);

drop policy if exists "admins_can_update_bug_reports" on public.bug_reports;
create policy "admins_can_update_bug_reports"
on public.bug_reports
for update
to authenticated
using (
  exists (
    select 1 from public.report_admins a
    where a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.report_admins a
    where a.user_id = auth.uid()
  )
);

drop policy if exists "admins_can_delete_bug_reports" on public.bug_reports;
create policy "admins_can_delete_bug_reports"
on public.bug_reports
for delete
to authenticated
using (
  exists (
    select 1 from public.report_admins a
    where a.user_id = auth.uid()
  )
);

insert into storage.buckets (id,name,public,file_size_limit)
values ('bug-report-files','bug-report-files',false,10485760)
on conflict (id) do update
set public=false,file_size_limit=10485760;

drop policy if exists "public_can_upload_bug_report_files" on storage.objects;
create policy "public_can_upload_bug_report_files"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'bug-report-files'
  and (storage.foldername(name))[1] is not null
);

drop policy if exists "admins_can_read_bug_report_files" on storage.objects;
create policy "admins_can_read_bug_report_files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'bug-report-files'
  and exists (
    select 1 from public.report_admins a
    where a.user_id = auth.uid()
  )
);

drop policy if exists "admins_can_delete_bug_report_files" on storage.objects;
create policy "admins_can_delete_bug_report_files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'bug-report-files'
  and exists (
    select 1 from public.report_admins a
    where a.user_id = auth.uid()
  )
);

-- 개발자 계정 UUID 등록 예시:
-- insert into public.report_admins(user_id)
-- values ('00000000-0000-0000-0000-000000000000')
-- on conflict do nothing;
