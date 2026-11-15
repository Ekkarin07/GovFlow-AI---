
-- GovFlow AI user profile extensions

ALTER TABLE auth_users
ADD COLUMN department_id TEXT;

ALTER TABLE auth_users
ADD COLUMN department_name TEXT;

ALTER TABLE auth_users
ADD COLUMN roles_json TEXT;

ALTER TABLE auth_users
ADD COLUMN joined_at TEXT;

-- Preserve existing roles and registration dates
UPDATE auth_users
SET
  roles_json = json_array(role),
  joined_at = created_at
WHERE roles_json IS NULL
   OR joined_at IS NULL;
