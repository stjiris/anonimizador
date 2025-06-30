import React, { useEffect, useState } from "react";
import './ProfileManagerApp.css';
import {
  AnonimizeProfile,
  getAnonimizeProfiles,
  getAllProfiles,
  addProfile,
  updateProfileByName,
  deleteProfile,
  loadAnonimizeProfiles,
} from "./AnonimizeProfiles";

export default function ProfileManagerApp() {
  const [profiles, setProfiles] = useState<AnonimizeProfile[]>([]);
  const [selected, setSelected] = useState<AnonimizeProfile | null>(null);
  const [newProfile, setNewProfile] = useState<AnonimizeProfile>({
    name: "",
    label: "",
    default_entity_types: [],
    allowed_entity_types: [],
  });

  useEffect(() => {
    loadAnonimizeProfiles().then(() => {
      setProfiles(getAllProfiles());
    });
  }, []);

  const handleSelect = (name: string) => {
    const p = profiles.find((p) => p.name === name);
    if (p) setSelected(p);
  };

  const handleSave = async () => {
    if (!selected) return;
    await updateProfileByName(selected.name, selected);
    alert("Perfil atualizado com sucesso");
  };

  const handleAdd = async () => {
    try {
      await addProfile(newProfile);
      setProfiles(getAllProfiles());
      alert("Perfil adicionado com sucesso");
      setNewProfile({
        name: "",
        label: "",
        default_entity_types: [],
        allowed_entity_types: [],
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm("Remover este perfil?")) return;
    await deleteProfile(name);
    setProfiles(getAllProfiles());
    setSelected(null);
  };

  return (
    <div className="container">
  <h1>Gestor de Perfis</h1>

  <button className="add" onClick={handleAdd}>Adicionar Perfil</button>

  <div className="profile-card">
    <h2>Perfis Existentes</h2>
    <ul>
      {profiles.map((p) => (
        <li key={p.name}>
          <button onClick={() => handleSelect(p.name)}>{p.label}</button>
          <button className="delete" onClick={() => handleDelete(p.name)}>Remover</button>
        </li>
      ))}
    </ul>
  </div>

  {selected && (
    <div className="profile-card">
      <h2>Editar Perfil</h2>
      <div className="profile-fields">
        <label>Label</label>
        <input
          value={selected.label}
          onChange={(e) => setSelected({ ...selected, label: e.target.value })}
        />
        <label>default_entity_types</label>
        <textarea
          value={selected.default_entity_types.join(",")}
          onChange={(e) => setSelected({
            ...selected,
            default_entity_types: e.target.value.split(","),
          })}
        />
        <label>allowed_entity_types</label>
        <textarea
          value={selected.allowed_entity_types.join(",")}
          onChange={(e) => setSelected({
            ...selected,
            allowed_entity_types: e.target.value.split(","),
          })}
        />
      </div>
      <div className="actions">
        <button className="save" onClick={handleSave}>Guardar</button>
      </div>
    </div>
  )}
</div>
  );
}
