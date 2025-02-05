-- Add function to generate UUID
CREATE OR REPLACE FUNCTION generate_uuid()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id uuid;
BEGIN
  new_id := gen_random_uuid();
  RETURN json_build_object('id', new_id);
END;
$$;