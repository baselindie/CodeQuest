-- Account deletion is handled by the authenticated delete-account Edge Function.
drop function if exists public.delete_own_account();
