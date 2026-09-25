alter table public.lessons
  add column if not exists word_path text not null default '';

update public.lessons
set word_path = pdf_path,
    pdf_path = ''
where lower(coalesce(pdf_path, '')) like '%.docx'
  and coalesce(word_path, '') = '';
