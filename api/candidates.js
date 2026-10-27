import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return res.status(500).json({
        error: `Env missing: SUPABASE_URL=${url ? "ok" : "MISSING"}, SUPABASE_SERVICE_ROLE_KEY=${key ? "ok" : "MISSING"}`,
      });
    }

    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("candidates")
      .select("id, name, skills, experience")
      .order("name");

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}