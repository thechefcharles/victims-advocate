-- Enforce append-only audit_log at the database level (updates/deletes are no-ops).

create rule audit_log_no_update as on update to public.audit_log do instead nothing;

create rule audit_log_no_delete as on delete to public.audit_log do instead nothing;
