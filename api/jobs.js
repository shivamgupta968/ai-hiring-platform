import { supabase } from "../lib/supabase.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === "POST") {
    const { title, description } = req.body || {};
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ error: "Title aur description zaroori hain" });
    }
    const { data, error } = await supabase
      .from("jobs")
      .insert({ title: title.trim(), description: description.trim() })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  res.status(405).json({ error: "Method not allowed" });
}