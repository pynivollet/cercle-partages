-- Schedule daily cron job to mark past events as completed at midnight (UTC)
SELECT cron.schedule(
  'mark-completed-events-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mprqsjlwfdjdnbgamfiu.supabase.co/functions/v1/mark-completed-events',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wcnFzamx3ZmRqZG5iZ2FtZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2OTY0NzEsImV4cCI6MjA4MjI3MjQ3MX0.1XC2fsFNTzZAjW4SJMaf4ybifZZbS0Pkjk4pXlrh1DY"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);