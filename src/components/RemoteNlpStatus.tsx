import React from "react";
import { Entity, normalizeEntityString } from "../types/Entity";
import { EntityPool } from "../types/EntityPool";

interface RemoteEntity {
    text: string,
    label_: string,
    start_char: number,
    end_char: number
}

interface RemoteNlpStatusProps {
    doc: HTMLElement
    pool: EntityPool
    disabled: boolean
}

interface RemoteNlpStatusState {
    requested: boolean
    messages: any[]
}

export default class RemoteNlpStatus extends React.Component<RemoteNlpStatusProps, RemoteNlpStatusState>{
    state: RemoteNlpStatusState = {
        requested: false,
        messages: []
    }
    
    runRemoteNlp = async () => {
        if( this.state.requested ) return;
        let text = this.props.doc.textContent;
        if( text == null ) return;
        this.setState({
            requested: true,
            messages: []
        })


        let fd = new FormData()
        fd.append("file", new Blob([text]), "input.txt")

        let resArray: RemoteEntity[] = await fetch("/from-text", {
            method: "POST",
            body: fd
        }).then( r => r.json() )

        let entities: {[key: string]: Entity} = {};
        for( let ent of resArray ){
            let id = normalizeEntityString(ent.text) + ent.label_
            if( !(id in entities) ){
                entities[id] = new Entity(ent.text, ent.label_);
            }
            entities[id].addOffset([{start: ent.start_char, end: ent.end_char-1}]) // Spacy has an enchar outside of entity
        }

        this.props.pool.entities = Object.values(entities).sort((a, b) => a.offsets[0].start-b.offsets[0].start)
        this.props.pool.updateOrder();
    }

    render(): React.ReactNode {
        return <button className="red-link fw-bold btn" onClick={this.runRemoteNlp} disabled={this.props.pool.entities.length > 0 || this.state.requested || this.props.disabled}>Sugerir</button>;
    }
}