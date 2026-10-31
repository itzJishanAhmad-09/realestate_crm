-- Add the new roles to the enum in their own transaction
alter type public.user_role add value if not exists 'channel_partner';
alter type public.user_role add value if not exists 'sales_executive';
