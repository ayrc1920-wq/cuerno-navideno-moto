do $$
declare
  yair uuid;
  nuevo uuid;
  i int;
begin
  select id into yair from public.participantes where nombre = 'Yair' limit 1;
  if yair is null then raise exception 'No encontre a Yair'; end if;
  for i in 1..5 loop
    nuevo := gen_random_uuid();
    insert into auth.users (id, aud, role, email)
      values (nuevo, 'authenticated', 'authenticated', 'prueba' || i || '@ejemplo.test');
    insert into public.participantes (id, codigo, nombre, correo_normalizado)
      values (nuevo, public.gen_codigo(8), 'Prueba' || i, 'prueba' || i || '@ejemplo.test');
    insert into public.recomendaciones (recomendador_id, recomendado_id, estado, validada_en)
      values (yair, nuevo, 'valida', now());
  end loop;
  perform public._otorgar_recompensas(yair);
end $$
