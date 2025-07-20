const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const profilesFilePath = path.join(__dirname, "src/file-profiles-config.json");

// Lê os perfis do ficheiro
function readProfiles() {
  const raw = fs.readFileSync(profilesFilePath, "utf-8");
  return JSON.parse(raw);
}

// Guarda os perfis no ficheiro
function writeProfiles(profiles) {
  fs.writeFileSync(profilesFilePath, JSON.stringify(profiles, null, 2), "utf-8");
}

// GET /profiles
app.get("/profiles", (req, res) => {
  res.json(readProfiles());
});

// GET /profiles/:name
app.get("/profiles/:name", (req, res) => {
  const profiles = readProfiles();
  const profile = profiles.find(p => p.name === req.params.name);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json(profile);
});

// POST /profiles
app.post("/profiles", (req, res) => {
  const profiles = readProfiles();
  const newProfile = req.body;

  if (profiles.find(p => p.name === newProfile.name)) {
    return res.status(400).json({ error: "Profile with that name already exists" });
  }

  profiles.push(newProfile);
  writeProfiles(profiles);
  res.status(201).json(newProfile);
});

// PUT /profiles/:name
app.put("/profiles/:name", (req, res) => {
  const profiles = readProfiles();
  const index = profiles.findIndex(p => p.name === req.params.name);

  if (index === -1) return res.status(404).json({ error: "Profile not found" });

  profiles[index] = { ...profiles[index], ...req.body };
  writeProfiles(profiles);
  res.json(profiles[index]);
});

// DELETE /profiles/:name
app.delete("/profiles/:name", (req, res) => {
  const profiles = readProfiles();
  const index = profiles.findIndex(p => p.name === req.params.name);

  if (index === -1) return res.status(404).json({ error: "Profile not found" });

  const removed = profiles.splice(index, 1);
  writeProfiles(profiles);
  res.json(removed[0]);
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`✅ Profiles API running at http://localhost:${PORT}`);
});
