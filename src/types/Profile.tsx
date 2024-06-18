import { ChangeEventHandler, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AUTO_ANONIMIZE, DONT_ANONIMIZE, FULL_ANONIMIZE, isAnonimizeFunctionIndex } from "../util/anonimizeFunctions";
import { EntityTypeIDefaults, updateEntityTypeI } from "./EntityTypes";
import { Button } from "../util/BootstrapIcons";
import { ProfileTypesTable } from "./ProfileTypesTable";

export interface ProfileI {
    name: string,
    tools: {
        sumarizador?: boolean,
        descritores?: boolean,
    },
    defaultEntityTypes: {
        [key: string]: {
            color: string,
            functionIndex: number,
        }
    },
}

export function isProfileI(arg: any): arg is ProfileI {
    if (!arg) return false;
    if (typeof arg.name !== "string") return false;
    if (typeof arg.tools !== "object") return false;
    if (typeof arg.defaultEntityTypes !== "object") return false;
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
                <Button onClick={onDownloadProfile} i="floppy" text="Salvar Perfil" className="btn btn-primary mx-1"/>
                <i className="bi bi-dot mx-1"></i>
                {profiles && profiles.map( p => <button key={p.name} className="col btn btn-primary mx-1" disabled={p.name === profile?.name} onClick={() => setProfile(p)}>{p.name}</button> )}
            </div>
            {profile &&
                <>
                    <div>
                        <p className="m-0">Ferramentas ativas:</p>
                        <input type="checkbox" className="form-check-input" id="perfilSumarizador" checked={profile.tools.sumarizador} onChange={e => setProfile({...profile, tools: {...profile.tools, sumarizador: e.target.checked}})}/>
                        <label className="form-check-label" htmlFor="perfilSumarizador">Sumarizador</label>
                        <br />
                        <input type="checkbox" className="form-check-input" id="perfilDescritores" checked={profile.tools.descritores} onChange={e => setProfile({...profile, tools: {...profile.tools, descritores: e.target.checked}})}/>
                        <label className="form-check-label" htmlFor="perfilDescritores">Descritores</label>
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

export function useAvaiableProfiles(): ProfileI[]{
    const [profiles, setProfiles] = useState<ProfileI[]>([]);
    useEffect(() => {
        const abortController = new AbortController();
        fetch("/profiles.json", {signal: abortController.signal}).then( r => r.json() ).then( r => {
            if( Array.isArray(r) ){
                setProfiles(r.filter( f => isProfileI(f) ));
            }
        });
        return () => abortController.abort();
    }, []);
    return profiles;
}