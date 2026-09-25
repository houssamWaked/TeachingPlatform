-- Images remain private; the app serves them through short-lived signed URLs.
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp'
]
where id = 'lesson-pdfs';
