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
  console.log(`Status: ${res.statusCode} - ` + `Type: ${req.method}` + ` - URL: http:/localhost:${PORT}/profiles`);
});

// GET /profiles/:name
app.get("/profiles/:name", (req, res) => {
  const profiles = readProfiles();
  const profile = profiles.find(p => p.name === req.params.name);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json(profile);
  console.log(`Status: ${res.statusCode} - ` + `Type: ${req.method}` + ` - URL: http:/localhost:${PORT}/profiles/${req.params.name}`);
});

// POST /profiles
app.post("/profiles", (req, res) => {
  const profiles = readProfiles();
  const newProfile = req.body;

  if (profiles.find(p => p.name === newProfile.name)) {
    console.log(`Status: ${res.status(400)} - ` + `Type: ${req.method}` + ` - URL: http:/localhost:${PORT}/profiles`);
    return res.status(400).json({ error: "Profile with that name already exists" });
  }

  profiles.push(newProfile);
  writeProfiles(profiles);
  res.status(201).json(newProfile);
  console.log(`Status: ${res.statusCode} - ` + `Type: ${req.method}` + ` - URL: http:/localhost:${PORT}/profiles`);
});

//NAO ESTA OK
// PUT /profiles/:name
app.put("/profiles/:name", (req, res) => {
  const profiles = readProfiles();
  const index = profiles.findIndex(p => p.name === req.params.name);

  if (index === -1) return res.status(404).json({ error: "Profile not found" });
  
  profiles[index] = { ...profiles[index], ...req.body };
  writeProfiles(profiles);
  res.json(profiles[index]);
  console.log(`Status: ${res.statusCode} - ` + `Type: ${req.method}` + ` - URL: http:/localhost:${PORT}/profiles/${req.params.name}`);
});

// DELETE /profiles/:name
app.delete("/profiles/:name", (req, res) => {
  const profiles = readProfiles();
  const index = profiles.findIndex(p => p.name === req.params.name);

  if (index === -1) return res.status(404).json({ error: "Profile not found" });

  const removed = profiles.splice(index, 1);
  writeProfiles(profiles);
  res.json(removed[0]);
  console.log(`Status: ${res.statusCode} - ` + `Type: ${req.method}` + ` - URL: http:/localhost:${PORT}/profiles/${req.params.name}`);
});

// ===============================
// Métodos para custom_entities
// ===============================

// GET /profiles/:name/custom-entities
app.get("/profiles/:name/custom-entities", (req, res) => {
  const profiles = readProfiles();
  const profile = profiles.find(p => p.name === req.params.name);

  if (!profile) return res.status(404).json({ error: "Profile not found" });

  res.json(profile.custom_entities || []);
  console.log(`Status: ${res.statusCode} - ` + `Type: ${req.method}` + ` - URL: http:/localhost:${PORT}/profiles/${req.params.name}/custom-entities`);
});

// PUT /profiles/:name/custom-entities
app.put("/profiles/:name/custom-entities", (req, res) => {
  const profiles = readProfiles();
  const index = profiles.findIndex(p => p.name === req.params.name);

  if (index === -1) return res.status(404).json({ error: "Profile not found" });

  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: "Expected an array of [word, type] tuples." });
  }

  profiles[index].custom_entities = req.body;
  writeProfiles(profiles);
  res.json(profiles[index].custom_entities);
  console.log(`Status: ${res.statusCode} - ` + `Type: ${req.method}` + ` - URL: http:/localhost:${PORT}/profiles/${req.params.name}/custom-entities`);
});

//NAO ESTA OK
// DELETE /profiles/:name/custom-entities
app.delete("/profiles/:name/custom-entities", (req, res) => {
  const profiles = readProfiles();
  const index = profiles.findIndex(p => p.name === req.params.name);
  if (index === -1) return res.status(404).json({ error: "Profile not found" });

  const { entriesToRemove } = req.body;

  if (!Array.isArray(entriesToRemove)) {
    console.log(`Status: ${res.status(400).statusCode} - ` + `Type: ${req.method}` + ` - URL: http:/localhost:${PORT}/profiles/${req.params.name}/custom-entities`);
    return res.status(400).json({ error: "Expected 'entriesToRemove' to be an array of [word, type] tuples." });
  }

  profiles[index].custom_entities = (profiles[index].custom_entities || []).filter(
    ([word, type]) => !entriesToRemove.some(([w, t]) => w === word && t === type)
  );

  writeProfiles(profiles);
  res.json(profiles[index].custom_entities);
  console.log(`Status: ${res.statusCode} - ` + `Type: ${req.method}` + ` - URL: http:/localhost:${PORT}/profiles/${req.params.name}/custom-entities`);
});

// ===============================
// Métodos para excluded-words
// ===============================

// GET /profiles/:name/excluded-words
app.get("/profiles/:name/excluded-words", (req, res) => {
  const profiles = readProfiles();
  const profile = profiles.find(p => p.name === req.params.name);

  if (!profile) return res.status(404).json({ error: "Profile not found" });

  res.json(profile.excluded_words || []);
  console.log(`Status: ${res.statusCode} - ` + `Type: ${req.method}` + ` - URL: http:/localhost:${PORT}/profiles/${req.params.name}/excluded-words`);
});

//NAO ESTA OK
// PUT /profiles/:name/excluded-words
app.put("/profiles/:name/excluded-words", (req, res) => {
  const profiles = readProfiles();
  const index = profiles.findIndex(p => p.name === req.params.name);

  if (index === -1) return res.status(404).json({ error: "Profile not found" });

  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: "Expected an array of strings." });
  }

  profiles[index].excluded_words = req.body;
  writeProfiles(profiles);
  res.json(profiles[index].excluded_words);
  console.log(`Status: ${res.statusCode} - ` + `Type: ${req.method}` + ` - URL: http:/localhost:${PORT}/profiles/${req.params.name}/excluded-words`);
});

//NAO ESTA OK
// DELETE /profiles/:name/excluded-words
app.delete("/profiles/:name/excluded-words", (req, res) => {
  const profiles = readProfiles();
  const index = profiles.findIndex(p => p.name === req.params.name);

  if (index === -1) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const { wordsToRemove } = req.body;

  if (!Array.isArray(wordsToRemove)) {
    return res.status(400).json({ error: "Expected 'wordsToRemove' to be an array of strings." });
  }

  profiles[index].excluded_words = (profiles[index].excluded_words || []).filter(
    word => !wordsToRemove.includes(word)
  );

  writeProfiles(profiles);
  res.json(profiles[index].excluded_words);
  console.log(`Status: ${res.statusCode} - ` + `Type: ${req.method}` + ` - URL: http:/localhost:${PORT}/profiles/${req.params.name}/excluded-words`);
});





// Inicia o servidor
app.listen(PORT, () => {
  console.log(`✅ Profiles API running at http://localhost:${PORT}`);
});
