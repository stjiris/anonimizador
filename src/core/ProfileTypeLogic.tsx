"use client";
import { ProfileI } from "@/types/ProfileType";
import { isAnonimizeFunctionIndex } from "./anonimizeFunctions";
import { updateEntityTypeI } from "./EntityTypeLogic";
import { ChangeEventHandler, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Button } from "./BootstrapIcons";
import { ProfileTypesTable } from "@/components/Anonimize/ProfileTypesTable";

export function isProfileI(arg: any): arg is ProfileI {
    if (!arg) return false;
    if (typeof arg.name !== "string") return false;
    if (typeof arg.tools !== "object") return false;
    if (typeof arg.defaultEntityTypes !== "object") return false;
    
    if (!arg.nerRgx || typeof arg.nerRgx !== "object") return false;
    if (typeof arg.nerRgx.nerOn !== "boolean") return false;
    if (typeof arg.nerRgx.rgxOn !== "boolean") return false;
    
    for( let key in arg.defaultEntityTypes ){
        if( typeof arg.defaultEntityTypes[key] !== "object" ) return false;
        if( typeof arg.defaultEntityTypes[key].color !== "string" ) return false;
        if( typeof arg.defaultEntityTypes[key].functionIndex !== "number" ) return false;
        if( isAnonimizeFunctionIndex(arg.defaultEntityTypes[key].functionIndex as number, -1) === -1 ){
            return false;
        }
    }
    return true;
}

export const ProfileIVersion = "ProfileI.v0.1";

export function getProfile(): ProfileI | null {
    let profile = JSON.parse(localStorage.getItem(ProfileIVersion) || "null");
    if (!profile) {
        return null;
    }
    for( let key in profile.defaultEntityTypes ){
        updateEntityTypeI(key, profile.defaultEntityTypes[key].color, profile.defaultEntityTypes[key].functionIndex);
    }
    return profile;
}

export function setProfile(profile: ProfileI | null) {
    if( profile === null ){
        localStorage.removeItem(ProfileIVersion);
        return;
    }

    for( let key in profile.defaultEntityTypes ){
        updateEntityTypeI(key, profile.defaultEntityTypes[key].color, profile.defaultEntityTypes[key].functionIndex);
    }
    
    if (!profile.nerRgx) {
        profile.nerRgx = { nerOn: true, rgxOn: true };
    } else {
        profile.nerRgx.nerOn = true;
        profile.nerRgx.rgxOn = true;
    }

    localStorage.setItem(ProfileIVersion, JSON.stringify(profile));
}


const ProfileContext = createContext<[value: ProfileI|null, setProfile: (arg: ProfileI|null)=>void]|null>(null);

export function useProfile() {
    let profile = useContext(ProfileContext);
    if (!profile) throw new Error("useProfile must be used within a ProfileProvider");
    return profile;
}

export function ProfileProvider({children}: {children: React.ReactNode}) {
    const state = useState<ProfileI|null>(getProfile);
    const [profile] = state;

    useEffect(() => {
        if(profile){
            setProfile(profile);
        }
    }, [profile])

    return <ProfileContext.Provider value={state}>
        {children}
    </ProfileContext.Provider>
}

export function ProfileSelector() {
    const [profile, setProfile] = useProfile();
    const availableProfiles = useAvaiableProfiles(); 
    const inputFileRef = useRef<HTMLInputElement>(null);

    const onFileChangeCallback = useCallback<ChangeEventHandler<HTMLInputElement>>((e) => {
        let file = e.target.files?.item(0);
        if( !file ){
            return;
        }
        let reader = new FileReader();
        reader.onload = (e) => {
            let profile = JSON.parse(reader.result as string);
            if( !isProfileI(profile) ){
                alert("Arquivo inválido");
                return;
            }

            setProfile(profile);
        }
        reader.readAsText(file);
        e.target.value = "";
    }, [setProfile]);
    const onDownloadProfile = useCallback(() => {
        let newName = prompt("Nome do perfil", profile?.name || "")
        if( !newName || availableProfiles.find( p => p.name === newName) ){
            alert("Nome inválido");
            return;
        }
        setProfile({...profile!, name: newName});
        let blob = new Blob([JSON.stringify(profile)], {type: "application/json"});
        let url = URL.createObjectURL(blob);
        let a = document.createElement("a");
        a.href = url;
        a.download = newName || "perfil.json";
        a.click();
        URL.revokeObjectURL(url);
    }, [profile]);

    const isInAvailable = availableProfiles.find( p => p.name === profile?.name );
    const profiles = isInAvailable || !profile ? availableProfiles : availableProfiles.concat(profile);

    
    return <>
        <div className="modal-header">
            <div><h4 className="modal-title" id="modal-info-label">Perfil</h4></div>
        </div>
        <div className="modal-body">
            <input ref={inputFileRef} type="file" hidden id="profileFile" onChange={onFileChangeCallback}/>
            <div>
                <Button onClick={() => inputFileRef.current?.click()} i="upload" text="Carregar Perfil" className="btn btn-primary"/>
                <Button onClick={onDownloadProfile} disabled={profile === null} i="floppy" text="Salvar Perfil" className="btn btn-primary mx-1"/>
                <i className="bi bi-dot mx-1"></i>
                {profiles && profiles.map( p => <button key={p.name} className="col btn btn-primary mx-1" disabled={p.name === profile?.name} onClick={() => setProfile(p)}>{p.name}</button> )}
                <i className="bi bi-dot mx-1"></i>
                <button className="col btn btn-primary mx-1" disabled={profile === null} onClick={() => setProfile(null)}>Sem perfil</button>
            </div>
            {profile &&
                <>
                    <div>
                        <p className="m-0">Ferramentas ativas:</p>
                        <input type="checkbox" className="form-check-input" id="perfilSumarizador" checked={profile.tools.sumarizador} onChange={e => setProfile({...profile, tools: {...profile.tools, sumarizador: e.target.checked}})}/>
                        <label className="form-check-label" htmlFor="perfilSumarizador" title="Ferramenta de sumarização treinada sobre acórdãos do Supremo Tribunal de Justiça">Sumarizador</label>
                        <br />
                        <input type="checkbox" className="form-check-input" id="perfilDescritores" checked={profile.tools.descritores} onChange={e => setProfile({...profile, tools: {...profile.tools, descritores: e.target.checked}})}/>
                        <label className="form-check-label" htmlFor="perfilDescritores" title="Ferramenta de extração de descritores treinada sobre acórdãos do Supremo Tribunal de Justiça">Descritores</label>
                    </div>
                    <div>
                        <p className="m-0">Versão Pro:</p>
                        <input type="checkbox" className="form-check-input" id="nerOn" checked={profile.nerRgx?.nerOn ?? true} onChange={e => setProfile({...profile, nerRgx: {...(profile.nerRgx || {}), nerOn: e.target.checked}})}/>
                        <br />
                        <input type="checkbox" className="form-check-input" id="rgxOn" checked={profile.nerRgx?.rgxOn ?? true} onChange={e => setProfile({...profile, nerRgx: {...(profile.nerRgx || {}), rgxOn: e.target.checked}})}/>
                        <label className="form-check-label" htmlFor="rgxOn" title="Utilização das regras REGEX na identificação de entidades">Regras REGEX</label>
                    </div>
                    <div>
                        <p className="m-0">Tipos padrão:</p>
                        <ProfileTypesTable />
                    </div>
                </>
            }
        </div>
    </>

}

export function useAvaiableProfiles(): ProfileI[] {
    const [profiles, setProfiles] = useState<ProfileI[]>([]);
    useEffect(() => {
        const abortController = new AbortController();
        fetch(`${process.env.NEXT_PUBLIC_BASE_PATH}/api/profiles`, { signal: abortController.signal })
            .then(r => {
                if (!r.ok) {
                    console.error("Failed to fetch profiles:", r.status, r.statusText);
                    return [];
                }
                return r.json();
            })
            .then(r => {
                console.log("Fetched profiles.json:", r);
                if (Array.isArray(r)) {
                    const filtered = r.filter(f => isProfileI(f));
                    console.log("Valid profiles after filter:", filtered);
                    setProfiles(filtered);
                } else {
                    console.error("profiles.json is not an array:", r);
                }
            })
            .catch(e => {
                if (e.name !== "AbortError") {
                    console.error("Error fetching profiles.json:", e);
                }
            });
        return () => abortController.abort();
    }, []);
    return profiles;
}
