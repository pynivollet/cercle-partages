-- Fix the existing invitation for pynivollet@hotmail.com
UPDATE invitations
SET 
  status = 'used',
  used_by = 'dc35a2db-089e-4254-9077-f6e748c5da62',
  used_at = NOW()
WHERE email = 'pynivollet@hotmail.com' AND status = 'pending';