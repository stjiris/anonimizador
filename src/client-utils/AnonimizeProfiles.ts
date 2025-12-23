"use client";

export interface AnonimizeProfile {
  name: string;        // Identificador interno
  label: string;       // Label visível no UI
  default_entity_types: string[];
  allowed_entity_types: string[];
}


let profiles: AnonimizeProfile[] = [];

//Carrega os perfis definidos em memória
export async function loadAnonimizeProfiles(): Promise<void> {
  if (profiles.length === 0) {
    const res = await fetch(`/api/profiles`);
    console.log(res);
    if (!res.ok) throw new Error("Erro ao carregar perfis");
    profiles = await res.json();
  }
}

//Devolve todas as labels e name identificadores dos perfis existentes
export function getAnonimizeProfiles(): { name: string, label: string }[] {
  return profiles.map(({ name, label }) => ({ name, label }));
}

//Devolve todos os perfis
export function getAllProfiles(): AnonimizeProfile[] {
  return profiles;
}

//Devolve um perfil por name
export function getProfileByName(name: string): AnonimizeProfile | undefined {
  return profiles.find(p => p.name === name);
}

//Adiciona um perfil a profiles e ao JSON
export async function addProfile(newProfile: AnonimizeProfile): Promise<void> {
  const exists = profiles.find(p => p.name === newProfile.name);
  if (exists) {
    throw new Error(`O perfil com o nome "${newProfile.name}" já existe.`);
  }

  const res = await fetch(`/api/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newProfile)
  });

  if (!res.ok) throw new Error("Erro ao adicionar perfil");

  profiles.push(await res.json());
}

//Edita um perfil a profiles e ao JSON
export async function updateProfileByName(name: string, changes: Partial<AnonimizeProfile>): Promise<void> {
  const index = profiles.findIndex(p => p.name === name);
  if (index === -1) {
    throw new Error(`O perfil com nome "${name}" não foi encontrado.`);
  }

  const res = await fetch(`/api/profiles/${name}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes)
  });

  if (!res.ok) throw new Error("Erro ao atualizar perfil");

  const updated = await res.json();
  profiles[index] = updated;
}

//Remove um perfil a profiles e ao JSON
export async function deleteProfile(name: string): Promise<void> {
  const index = profiles.findIndex(p => p.name === name);
  if (index === -1) {
    throw new Error(`Profile with name "${name}" not found.`);
  }

  const res = await fetch(`/api/profiles/${name}`, {
    method: "DELETE"
  });

  if (!res.ok) throw new Error("Erro ao remover perfil");

  profiles.splice(index, 1);
}


