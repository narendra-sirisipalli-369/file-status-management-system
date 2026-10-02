-- USER is department-less, same as ADMIN (not tied to one department like KIOSK).
ALTER TABLE users DROP CONSTRAINT users_department_matches_role;
ALTER TABLE users ADD CONSTRAINT users_department_matches_role CHECK (
  (role IN ('ADMIN', 'USER') AND department_id IS NULL) OR
  (role = 'KIOSK' AND department_id IS NOT NULL)
);
