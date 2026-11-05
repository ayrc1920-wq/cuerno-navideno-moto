-- =====================================================================
-- 03 · Vista "v_eventos": la bitácora de referidos con NOMBRES legibles
-- Se ejecuta UNA vez en Supabase > SQL Editor > New query > Run.
-- No cambia la tabla eventos_referido: solo crea una vista para leerla fácil.
-- =====================================================================
create or replace view public.v_eventos with (security_invoker = true) as
  select e.id,
         e.creado_en at time zone 'America/Bogota' as fecha_bogota,
         p.nombre as quien_invito,
         q.nombre as quien_uso_el_enlace,
         e.resultado,
         e.motivo
    from public.eventos_referido e
    left join public.participantes p on p.id = e.recomendador_id
    left join public.participantes q on q.id = e.recomendado_id
   order by e.id desc;

-- Solo tú (administrador) la ves; los visitantes no.
revoke all on public.v_eventos from anon, authenticated;

select * from public.v_eventos;
