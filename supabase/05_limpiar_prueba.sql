do $$
declare yair uuid;
begin
  select id into yair from public.participantes where nombre = 'Yair' limit 1;
  delete from public.recompensas where participante_id = yair;
  delete from public.eventos_referido where recomendado_id in (select id from public.participantes where correo_normalizado like 'prueba%@ejemplo.test');
  delete from auth.users where email like 'prueba%@ejemplo.test';
end $$
