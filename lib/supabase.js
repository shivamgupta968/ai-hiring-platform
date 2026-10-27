import { createClient } from "@supabase/supabase-js";

// Service role key sirf server par use hoti hai, frontend mein kabhi nahi jati
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);