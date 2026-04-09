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

    for (let key in arg.defaultEntityTypes) {
        if (typeof arg.defaultEntityTypes[key] !== "object") return false;
        if (typeof arg.defaultEntityTypes[key].color !== "string") return false;
        if (typeof arg.defaultEntityTypes[key].functionIndex !== "number") return false;
        if (isAnonimizeFunctionIndex(arg.defaultEntityTypes[key].functionIndex as number, -1) === -1) {
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
    for (let key in profile.defaultEntityTypes) {
        updateEntityTypeI(key, profile.defaultEntityTypes[key].color, profile.defaultEntityTypes[key].functionIndex);
    }
    return profile;
}

export function setProfile(profile: ProfileI | null) {
    if (profile === null) {
        localStorage.removeItem(ProfileIVersion);
        return;
    }

    for (let key in profile.defaultEntityTypes) {
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


const ProfileContext = createContext<[value: ProfileI | null, setProfile: (arg: ProfileI | null) => void] | null>(null);

export function useProfile() {
    let profile = useContext(ProfileContext);
    if (!profile) throw new Error("useProfile must be used within a ProfileProvider");
    return profile;
}

export function ProfileProvider({ children, onChange }: { children: React.ReactNode, onChange?: (profile: ProfileI | null) => void }) {
    const state = useState<ProfileI | null>(getProfile);
    const [profile] = state;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        if (profile) {
            setProfile(profile);
        }
        onChangeRef.current?.(profile ?? null);
    }, [profile])

    return <ProfileContext.Provider value={state}>
        {children}
    </ProfileContext.Provider>
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
