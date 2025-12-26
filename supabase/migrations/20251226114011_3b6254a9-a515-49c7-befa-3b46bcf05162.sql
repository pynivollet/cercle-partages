INSERT INTO public.invitations (email, role, status, expires_at)
VALUES ('pynivollet@gmail.com', 'admin', 'pending', now() + interval '30 days')
RETURNING token;