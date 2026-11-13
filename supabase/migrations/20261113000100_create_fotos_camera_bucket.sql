-- Bucket público da atividade. Leitura dos arquivos por URL pública;
-- upload e listagem ficam limitados à pasta capturas/ e a imagens.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-camera',
  'fotos-camera',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Aula: upload fotos-camera" on storage.objects;
create policy "Aula: upload fotos-camera"
on storage.objects for insert to anon
with check (
  bucket_id = 'fotos-camera'
  and (storage.foldername(name))[1] = 'capturas'
  and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp', 'heic')
);

drop policy if exists "Aula: listar fotos-camera" on storage.objects;
create policy "Aula: listar fotos-camera"
on storage.objects for select to anon
using (
  bucket_id = 'fotos-camera'
  and (storage.foldername(name))[1] = 'capturas'
);
