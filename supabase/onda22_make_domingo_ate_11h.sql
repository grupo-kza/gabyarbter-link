-- Domingo só até as 11h (André, 18/11/2026: a Gaby já combinou isso com as clientes).
-- O último horário de domingo é o que termina até as 11h.
-- Em 18/11/2026 o domingo era uma faixa só, 06:00 às 20:00, e havia 2 makes futuras
-- de domingo, nenhuma depois das 11h. Conferir de novo antes de aplicar:
--   select id, start_time, end_time, active from make_weekly_schedule where weekday = 0;
-- Volta: supabase/onda22_make_domingo_ate_11h_rollback.sql
update make_weekly_schedule
   set end_time = '11:00:00'
 where weekday = 0 and active and start_time < '11:00:00' and end_time > '11:00:00';

update make_weekly_schedule
   set active = false
 where weekday = 0 and active and start_time >= '11:00:00';
