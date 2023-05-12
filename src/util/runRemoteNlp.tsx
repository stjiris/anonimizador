import { Entity, normalizeEntityString } from "../types/Entity";
import { EntityPool } from "../types/EntityPool";

interface RemoteEntity {
    text: string,
    label_: string,
    start_char: number,
    end_char: number
}

    
let runRemoteNlpRequesting = false;
export async function runRemoteNlp(doc: HTMLElement, pool: EntityPool){
    if( runRemoteNlpRequesting ) return;
    runRemoteNlpRequesting = true;
    
    let text = Array.from(doc.children).map(h => h.textContent).join("\n").normalize("NFKC")

    let fd = new FormData()
    fd.append("file", new Blob([text]), "input.json")

    let resArray: RemoteEntity[] = await fetch("./from-text", {
        method: "POST",
        body: fd
    }).then( r => {
        if( r.status === 200 )
            return r.json();
        alert( `Servidor respondeu: ${r.status} (${r.statusText})` )
        return [];
    }).catch( e => {
        alert( e );
        return [];
    })
    let errorOffset = 0;
    let entities: {[key: string]: Entity} = {};
    let lastEndOffset = 0;
    for( let ent of resArray ){
        console.log(lastEndOffset)
        let id = normalizeEntityString(ent.text) + ent.label_
        if( !(id in entities) ){
            entities[id] = new Entity(ent.label_);
        }
        let soff = text.substring(0,ent.start_char).match(/\n/g)?.length || 0
        let eoff = text.substring(0,ent.end_char).match(/\n/g)?.length || 0
        if( pool.originalText.substring(ent.start_char-soff+errorOffset, ent.end_char-eoff+errorOffset) == ent.text ){
            entities[id].addOffset([{start: ent.start_char-soff+errorOffset, end: ent.end_char-1-eoff+errorOffset, preview: ent.text}]) // Spacy has an endchar outside of entity
            lastEndOffset = ent.end_char-1-eoff+errorOffset;
        }
        else{
            let m = pool.originalText.substring(ent.start_char-soff+errorOffset).match(ent.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // escape because string.match uses new RegExp
            if( m ){
                errorOffset+=m.index || 0;
            }
            if( pool.originalText.substring(ent.start_char-soff+errorOffset, ent.end_char-eoff+errorOffset) == ent.text ){
                entities[id].addOffset([{start: ent.start_char-soff+errorOffset, end: ent.end_char-1-eoff+errorOffset, preview: ent.text}]) // Spacy has an endchar outside of entity
                lastEndOffset = ent.end_char-1-eoff+errorOffset
            }
            else{
                let m = pool.originalText.substring(lastEndOffset).match(ent.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // escape because string.match uses new RegExp
                if( m && pool.originalText.substring(lastEndOffset+(m.index || 0), lastEndOffset+(m.index || 0)+ent.text.length) == ent.text ){
                    entities[id].addOffset([{start: lastEndOffset+(m.index || 0), end: lastEndOffset+(m.index||0)+ent.text.length-1, preview: ent.text}]) // Spacy has an endchar outside of entity
                    lastEndOffset += (m.index||0)+ent.text.length-1
                }
                else{
                    let allMatches = pool.originalText.matchAll(new RegExp(ent.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),"g"));
                    let m = allMatches.next();
                    let minDist = Infinity
                    let minIndex = Infinity
                    while( !m.done ){
                        console.error("Cannot add entity", ent.text, m.value.index, ent.start_char)
                        if( Math.abs((m.value.index|| 0)-ent.start_char) < minDist ){
                            minDist = Math.abs((m.value.index|| 0)-ent.start_char)
                            minIndex = m.value.index || 0
                        }
                        minDist = Math.min(Math.abs((m.value.index|| 0)-ent.start_char), minDist);
                        m = allMatches.next();
                    }
                    if( minDist != Infinity ){
                        entities[id].addOffset([{start: minIndex, end: minIndex+ent.text.length-1, preview: ent.text}])
                        lastEndOffset = minIndex+ent.text.length-1
                    }
                    else{
                        console.error("Cannot add entity", ent.text)
                    }
                }
            }
        }
    }

    pool.entities = Object.values(entities).filter(e => e.offsets.length > 0).sort((a, b) => a.offsets[0].start-b.offsets[0].start)
    pool.updateOrder("Sugerir");
    runRemoteNlpRequesting = false;
}