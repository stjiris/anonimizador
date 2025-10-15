import { useEffect, useRef } from "react";
import { AnonimizeStateState } from "../types/AnonimizeState";
import { Entity, normalizeEntityString } from "../types/Entity";
import { UserFile } from "../types/UserFile";
import { Button } from "./BootstrapIcons";
import { useEntities } from "./uses";
import { getProfile, ProfileI, useAvaiableProfiles, useProfile } from "types/Profile";

export function SuggestButton({ setRequesting, file, requesting, state }: { setRequesting: (b: boolean) => void, file: UserFile, requesting: boolean, state: AnonimizeStateState }) {
    let ents = useEntities(file.pool)
    const disabled = ents.length > 0 || requesting || state !== AnonimizeStateState.TAGGED;
    const signal = useRef<AbortController>()

    //Updating the logic in this function to check which profile is in use to cover a special case
    //for anonymization within the main/secondary STJ profiles;

    const [profile, setProfile] = useProfile();

    useEffect(() => {
        signal.current = new AbortController();
        return () => {
            signal.current?.abort()
        }
    }, [])

    if (requesting) {
        return <button className="btn btn-small btn-primary m-1 p-1" disabled><span className="spinner-border spinner-border-sm" role="status"></span> A sugerir...</button>
    }

    return <Button i="file-earmark-play" text="Sugerir" className={`btn btn-small btn-primary m-1 p-1 ${disabled ? "border-0 bg-white text-muted" : ""}`} 
    onClick={() => {

        setRequesting(true);
        runRemoteNlp(file, signal.current?.signal)
            .then(() => { //This code runs after a list of entities and instances is returned by the remoteNLP process;
                setRequesting(false);

                file.profile = profile?.name;
                file.checkCountPES();
            });
    }}

    disabled={disabled} />
}


interface RemoteEntity {
    text: string,
    label_: string,
    start_char: number,
    end_char: number
}

function textFrom(html: Element): string {
    if (html.tagName === "P") {
        return (html.textContent || "") + "\n";
    }
    if (html.nodeType === document.TEXT_NODE) {
        return (html.textContent || "");
    }
    return Array.from(html.children).map(el => textFrom(el)).join("");
}

let runRemoteNlpRequesting = false;
export async function runRemoteNlp(file: UserFile, abort?: AbortSignal) {
    if (runRemoteNlpRequesting) return;
    runRemoteNlpRequesting = true;

    let doc = file.doc;
    let pool = file.pool;

    let text = textFrom(doc);
    let fd = new FormData()
    fd.append("file", new Blob([text]), "input.txt")

    let resArray: RemoteEntity[] = await fetch("./from-text", {
        method: "POST",
        body: fd,
        signal: abort
    }).then(r => {
        if (r.status === 200)
            return r.json();
        alert(`Servidor respondeu: ${r.status} (${r.statusText})`)
        return [];
    }).catch(e => {
        if (e instanceof DOMException && e.name === "AbortError") return [];
        alert(e);
        return [];
    })

    if (resArray.length === 0) {
        runRemoteNlpRequesting = false;
        return;
    }

    let entities: { [key: string]: Entity } = {};
    let usedIndexes: { [key: number]: boolean } = {};
    let errors: RemoteEntity[] = []

    for (let ent of resArray) {
        let id = normalizeEntityString(ent.text) + ent.label_
        if (!(id in entities)) {
            entities[id] = new Entity(ent.label_);
        }

        let allMatches = pool.originalText.matchAll(new RegExp(ent.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g"));
        let m = allMatches.next();
        let minDist = Infinity
        let minIndex = Infinity
        while (!m.done) {
            if (Math.abs((m.value.index || 0) - ent.start_char) < minDist && !usedIndexes[m.value.index || 0]) {
                minDist = Math.abs((m.value.index || 0) - ent.start_char)
                minIndex = m.value.index || 0
            }
            m = allMatches.next();
        }
        if (minIndex !== Infinity) {
            usedIndexes[minIndex] = true;
            entities[id].addOffset([{ start: minIndex, end: minIndex + ent.text.length - 1, preview: ent.text }])
        }
        else {
            errors.push(ent);
        }
    }

    pool.entities = Object.values(entities).filter(e => e.offsets.length > 0).sort((a, b) => a.offsets[0].start - b.offsets[0].start)
    pool.updateOrder("Sugerir");
    runRemoteNlpRequesting = false;

    //if (errors.length > 0) {
    //    alert(`Não foi possível sinalizar na aplicação algumas das entidades detetadas (${errors.length}): ${errors.map(e => e.text).join(", ")}\n
    //    Por favor, reporte este problema por email, enviando o documento usado.`)
    //}
}