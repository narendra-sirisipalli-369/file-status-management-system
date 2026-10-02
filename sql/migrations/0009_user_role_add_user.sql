-- New restricted role: dashboard, file entry, and file search only (no
-- master data / procurement process / admin management access). Kept in a
-- migration of its own — ALTER TYPE ... ADD VALUE must commit before the
-- new value can be referenced in a later statement (see 0010).
ALTER TYPE user_role ADD VALUE 'USER';
