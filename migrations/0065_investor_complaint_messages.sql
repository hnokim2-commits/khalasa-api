ALTER TABLE complaint_messages
  DROP CONSTRAINT IF EXISTS complaint_messages_sender_role_check;

ALTER TABLE complaint_messages
  ADD CONSTRAINT complaint_messages_sender_role_check
  CHECK (sender_role IN ('customer','merchant','admin','city_admin','investor'));

COMMENT ON TABLE complaint_messages IS 'Private complaint conversation between the customer and authorized merchant, investor, and operations users.';
