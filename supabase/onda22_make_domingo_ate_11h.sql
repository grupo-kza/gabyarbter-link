-- Domingo só até as 11h (André, 18/11/2026: a Gaby já combinou isso com as clientes).
-- Vale para a agenda online: horário de domingo termina às 11h (o último horário
-- é o que acaba até 11h). Em 18/11/2026 não havia make futura de domingo depois das 11h.
-- Volta: supabase/onda22_make_domingo_ate_11h_rollback.sql
update make_weekly_schedule
   set end_time = '11:00:00'
 where weekday = 0 and active and start_time = '06:00:00' and end_time = '20:00:00';
