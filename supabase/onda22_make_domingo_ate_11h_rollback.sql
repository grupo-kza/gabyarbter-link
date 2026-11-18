-- Volta o domingo para 6h às 20h.
update make_weekly_schedule
   set end_time = '20:00:00'
 where weekday = 0 and active and start_time = '06:00:00' and end_time = '11:00:00';
