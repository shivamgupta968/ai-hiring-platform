import { useState, useEffect } from "react";
import "./App.css";
import { runTests } from "./runCode";

const SKILL_WEIGHT = 0.5;
const TEST_WEIGHT = 0.5;

const KNOWN_SKILLS = [
  "React", "JavaScript", "TypeScript", "CSS", "HTML", "Node", "Express",
  "MongoDB", "Python", "SQL", "Git", "Redux", "Java", "C++",
];

const QUESTION = {
  title: "Duplicate number",
  prompt:
    "Function solve(nums) likhiye jo array mein sabse pehla duplicate number return kare. Agar duplicate na ho to null return karein.",
  starter: "function solve(nums) {\n  // yahan code likhein\n}",
  tests: [
    { input: [[1, 2, 3, 2]], expected: 2 },
    { input: [[5, 1, 5, 1]], expected: 5 },
    { input: [[1, 2, 3]], expected: null },
  ],
};

const JSON_HEADERS = { "Content-Type": "application/json" };

function extractSkills(text) {
  return KNOWN_SKILLS.filter((skill) =>
    new RegExp(`\\b${skill}\\b`, "i").test(text)
  );
}

function matchScore(candidateSkills, jobSkills) {
  if (jobSkills.length === 0) return 0;
  const matched = jobSkills.filter((s) => candidateSkills.includes(s));
  return Math.round((matched.length / jobSkills.length) * 100);
}

async function api(path, options = {}) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request fail (${res.status})`);
  return data;
}

export default function App() {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState("");
  const [scores, setScores] = useState({});
  const [error, setError] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [savingJob, setSavingJob] = useState(false);

  const [candidateId, setCandidateId] = useState("");
  const [codes, setCodes] = useState({});
  const [runResult, setRunResult] = useState(null);
  const [running, setRunning] = useState(false);

  const selectedJob = jobs.find((j) => j.id === jobId);
  const jobSkills = extractSkills(selectedJob?.description ?? "");

  async function loadScores(id) {
    if (!id) {
      setScores({});
      return;
    }
    const rows = await api(`/api/scores?job_id=${id}`);
    const map = {};
    rows.forEach((r) => {
      map[r.candidate_id] = r;
    });
    setScores(map);
  }

  useEffect(() => {
    Promise.all([api("/api/candidates"), api("/api/jobs")])
      .then(([cands, jobList]) => {
        setCandidates(cands);
        setJobs(jobList);
        if (cands.length) setCandidateId(cands[0].id);
        if (jobList.length) setJobId(jobList[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    loadScores(jobId).catch((e) => setError(e.message));
  }, [jobId]);

  useEffect(() => {
    setRunResult(null);
  }, [candidateId]);

  const code = codes[candidateId] ?? QUESTION.starter;

  async function handleCreateJob(e) {
    e.preventDefault();
    setError("");
    setSavingJob(true);
    try {
      const created = await api("/api/jobs", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ title: newTitle, description: newDesc }),
      });
      setJobs((prev) => [created, ...prev]);
      setJobId(created.id);
      setNewTitle("");
      setNewDesc("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingJob(false);
    }
  }

  async function handleRun() {
    setError("");
    if (!jobId) {
      setError("Pehle job chunein ya naya job banayein, taaki score save ho sake.");
      return;
    }
    if (!candidateId) return;

    setRunning(true);
    setRunResult(null);
    try {
      const result = await runTests(code, QUESTION.tests);
      if (result.error) throw new Error(result.error);

      const passed = result.results.filter((r) => r.pass).length;
      const total = result.results.length;
      setRunResult({ passed, total, results: result.results });

      await api("/api/scores", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          job_id: jobId,
          candidate_id: candidateId,
          language: "javascript",
          passed,
          total,
        }),
      });
      await loadScores(jobId);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  const results = candidates
    .map((c) => {
      const skillScore = matchScore(c.skills, jobSkills);
      const s = scores[c.id];
      const testScore = s ? Math.round((s.passed / s.total) * 100) : 0;
      const finalScore = Math.round(skillScore * SKILL_WEIGHT + testScore * TEST_WEIGHT);
      return { ...c, skillScore, testScore, tested: !!s, finalScore };
    })
    .sort((a, b) => b.finalScore - a.finalScore);

  const candidateName = candidates.find((c) => c.id === candidateId)?.name ?? "";

  return (
    <div className="app">
      <main>
        <h1>AI Hiring Platform</h1>

        {error && <p style={{ color: "#ffb4b4" }}>{error}</p>}

        <div>
          <label>Job chunein</label>
          <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
            <option value="">-- job chunein --</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>

          {selectedJob && <p>{selectedJob.description}</p>}
          {selectedJob && (
            <p>Skills detected: {jobSkills.length ? jobSkills.join(", ") : "none"}</p>
          )}

          <form onSubmit={handleCreateJob}>
            <label>Naya job banayein</label>
            <textarea
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Job title, jaise: React Developer"
              rows={1}
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Job description, jaise: Looking for a React developer with JavaScript and CSS"
              rows={3}
            />
            <button type="submit" disabled={savingJob}>
              {savingJob ? "Save ho raha hai..." : "Job save karein"}
            </button>
          </form>
        </div>

        <section>
          <h2>Top Candidates {selectedJob && `for ${selectedJob.title}`}</h2>
          <p>Final score = {SKILL_WEIGHT * 100}% skills + {TEST_WEIGHT * 100}% coding test</p>

          {results.map((c) => (
            <div key={c.id} className="candidate-card">
              <h3>{c.name}</h3>
              <p>Skills: {c.skills.join(", ")}</p>
              <p>Experience: {c.experience}</p>
              <p>
                Skills match: {c.skillScore}% | Coding test:{" "}
                {c.tested ? `${c.testScore}%` : "abhi test nahi hua"}
              </p>
              <strong>Final score: {c.finalScore}%</strong>
            </div>
          ))}
        </section>

        <section>
          <h2>Coding Test: {QUESTION.title}</h2>
          <p>{QUESTION.prompt}</p>

          <label>Candidate chunein</label>
          <select value={candidateId} onChange={(e) => setCandidateId(e.target.value)}>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <label>Language: JavaScript</label>
          <textarea
            value={code}
            onChange={(e) => setCodes((prev) => ({ ...prev, [candidateId]: e.target.value }))}
            rows={10}
            style={{ fontFamily: "monospace" }}
          />

          <div>
            <button onClick={handleRun} disabled={running || !candidateId}>
              {running ? "Chal raha hai..." : "Run tests"}
            </button>
          </div>
          <p>Run karne par result is job ke liye save ho jata hai.</p>

          {runResult && (
            <div>
              <h3>
                {candidateName}: {runResult.passed} / {runResult.total} passed
              </h3>
              {runResult.results.map((r, i) => (
                <p key={i}>
                  {r.pass ? "✓" : "✗"} Input: {r.input} | Expected: {r.expected} | Got:{" "}
                  {r.error ? `Error: ${r.error}` : r.got}
                </p>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}