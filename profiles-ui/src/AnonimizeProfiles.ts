export interface AnonimizeProfile {
  name: string;       
  label: string;     
  default_entity_types: string[];
  allowed_entity_types: string[];
  custom_entities?: [string, string][];
  excluded_words?: string[];
}

const API_BASE = "http://localhost:4000";

let profiles: AnonimizeProfile[] = [];

export async function loadAnonimizeProfiles(): Promise<void> {
  if (profiles.length === 0) {
    const res = await fetch(`${API_BASE}/profiles`);
    console.log(res);
    if (!res.ok) throw new Error("Erro ao carregar perfis");
    profiles = await res.json();
  }
}

export function getAnonimizeProfiles(): { name: string, label: string }[] {
    return profiles.map(({ name, label }) => ({ name, label }));
}

export function getAllProfiles(): AnonimizeProfile[] {
    return profiles;
}

export function getProfileByName(name: string): AnonimizeProfile | undefined {
    return profiles.find(p => p.name === name);
}

export async function addProfile(newProfile: AnonimizeProfile): Promise<void> {
  const exists = profiles.find(p => p.name === newProfile.name);
  if (exists) {
    throw new Error(`O perfil com o nome "${newProfile.name}" já existe.`);
  }

  const res = await fetch(`${API_BASE}/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newProfile)
  });

  if (!res.ok) throw new Error("Erro ao adicionar perfil");

  profiles.push(await res.json());
}

export async function updateProfileByName(name: string, changes: Partial<AnonimizeProfile>): Promise<void> {
  const index = profiles.findIndex(p => p.name === name);
  if (index === -1) {
    throw new Error(`O perfil com nome "${name}" não foi encontrado.`);
  }

  const res = await fetch(`${API_BASE}/profiles/${name}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes)
  });

  if (!res.ok) throw new Error("Erro ao atualizar perfil");

  const updated = await res.json();
  profiles[index] = updated;
}

export async function deleteProfile(name: string): Promise<void> {
  const index = profiles.findIndex(p => p.name === name);
  if (index === -1) {
    throw new Error(`Profile with name "${name}" not found.`);
  }

  const res = await fetch(`${API_BASE}/profiles/${name}`, {
    method: "DELETE"
  });

  if (!res.ok) throw new Error("Erro ao remover perfil");

  profiles.splice(index, 1);
}


// ===============================
// Métodos para custom_entities
// ===============================

export async function getCustomEntities(name: string): Promise<[string, string][]> {
  const res = await fetch(`${API_BASE}/profiles/${name}/custom-entities`);
  if (!res.ok) throw new Error("Erro ao obter custom_entities");
  return await res.json();
}

export async function updateCustomEntities(name: string, entities: [string, string][]): Promise<void> {
  const res = await fetch(`${API_BASE}/profiles/${name}/custom-entities`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entities)
  });
  if (!res.ok) throw new Error("Erro ao atualizar custom_entities");
}

export async function deleteCustomEntities(name: string, entitiesToRemove: [string, string][]): Promise<void> {
  const res = await fetch(`${API_BASE}/profiles/${name}/custom-entities`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entriesToRemove: entitiesToRemove })
  });
  if (!res.ok) throw new Error("Erro ao remover custom_entities");
}

// ===============================
// Métodos para excluded_words
// ===============================

export async function getExcludedWords(name: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/profiles/${name}/excluded-words`);
  if (!res.ok) throw new Error("Erro ao obter excluded_words");
  return await res.json();
}

export async function updateExcludedWords(name: string, words: string[]): Promise<void> {
  const res = await fetch(`${API_BASE}/profiles/${name}/excluded-words`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(words)
  });
  if (!res.ok) throw new Error("Erro ao atualizar excluded_words");
}

export async function deleteExcludedWords(name: string, wordsToRemove: string[]): Promise<void> {
  const res = await fetch(`${API_BASE}/profiles/${name}/excluded-words`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wordsToRemove })
  });
  if (!res.ok) throw new Error("Erro ao remover excluded_words");
}

