-- Keep documents private and use the existing lesson pdf_path column and bucket.
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
where id = 'lesson-pdfs';
