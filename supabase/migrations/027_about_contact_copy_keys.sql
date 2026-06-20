-- Phase A: About app name/version + Contact form labels (support_copy keys)

INSERT INTO public.support_copy (key, body)
VALUES
  ('about_app_name', 'Nature''s Grace'),
  ('about_app_version', 'Version 1.0.0'),
  ('about_mission_section_title', 'Our Mission'),
  ('contact_info_label_email', 'Email'),
  ('contact_info_label_phone', 'Phone'),
  ('contact_info_label_hours', 'Hours'),
  ('contact_section_your_tickets', 'Your tickets'),
  ('contact_section_send_message', 'Send Message'),
  ('contact_form_label_name', 'Name'),
  ('contact_form_label_subject', 'Subject'),
  ('contact_form_label_message', 'Message'),
  ('contact_form_placeholder_name', 'Your name'),
  ('contact_form_placeholder_subject', 'What is this about?'),
  ('contact_form_placeholder_message', 'Write your message...'),
  ('contact_form_button_send', 'Send')
ON CONFLICT (key) DO NOTHING;
