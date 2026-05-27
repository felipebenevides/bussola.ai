-- Throttle do quiz de revisão diária via Vercel Cron (/api/cron/daily-quiz).
-- Garante que nenhum aluno recebe mais de 1 quiz por janela de N horas.

ALTER TABLE bussola.user_whatsapp
  ADD COLUMN IF NOT EXISTS last_quiz_sent_at timestamptz;

COMMENT ON COLUMN bussola.user_whatsapp.last_quiz_sent_at IS
  'Throttle do quiz de revisão diária via cron (/api/cron/daily-quiz).';
