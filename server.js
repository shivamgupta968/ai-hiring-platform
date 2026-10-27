import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

const candidates = [
  { name: "Shivam Gupta", skills: ["React", "JavaScript", "CSS"], experience: "fresher" },
  { name: "Priya Shah", skills: ["React", "HTML", "JavaScript"], experience: "8 month" },
];

app.get("/api/candidates", (req, res) => {
  res.json(candidates);
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});