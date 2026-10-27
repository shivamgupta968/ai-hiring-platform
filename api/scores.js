import { supabase } from "../lib/supabase.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { job_id } = req.query;
    if (!job_id) return res.status(400).json({ error: "job_id chahiye" });

    const { data, error } = await supabase
      .from("scores")
      .select("*")
      .eq("job_id", job_id)
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    // Har candidate ka sirf latest score
    const latest = {};
    for (const row of data) {
      if (!latest[row.candidate_id]) latest[row.candidate_id] = row;
    }
    return res.json(Object.values(latest));
  }

  if (req.method === "POST") {
    const { job_id, candidate_id, language, passed, total } = req.body || {};
    if (!job_id || !candidate_id || !language) {
      return res.status(400).json({ error: "job_id, candidate_id, language zaroori hain" });
    }
    if (!Number.isInteger(passed) || !Number.isInteger(total) || total <= 0 || passed < 0 || passed > total) {
      return res.status(400).json({ error: "passed/total galat hain" });
    }
    const { data, error } = await supabase
      .from("scores")
      .insert({ job_id, candidate_id, language, passed, total })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  res.status(405).json({ error: "Method not allowed" });
}