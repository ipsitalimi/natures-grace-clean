-- Phase A: ticket submit confirmation stored in support_copy

INSERT INTO public.support_copy (key, body)
VALUES (
  'ticket_submit_confirmation',
  'Ticket submitted — our team will respond soon.'
)
ON CONFLICT (key) DO NOTHING;
