import React from "react";
import { Entity, normalizeEntityString } from "../types/Entity";
import { FiltersI } from "../types/EntityFilters";
import { EntityPool } from "../types/EntityPool";

interface RemoteEntity {
    text: string,
    label_: string,
    start_char: number,
    end_char: number
}

interface RemoteNlpStatusProps {
    pool: EntityPool
    disabled: boolean
    filters: FiltersI[]
}

interface RemoteNlpStatusState {
    requested: boolean
    text: string
}

export default class RemoteNlpStatus extends React.Component<RemoteNlpStatusProps, RemoteNlpStatusState>{
    state: RemoteNlpStatusState = {
        requested: false,
        text: "Sugerir"
    }
    
    runRemoteNlp = async () => {
        if( this.state.requested || this.props.pool.originalText == "") return;
        this.setState({
            requested: true,
            text: "Aguarde"
        })


        let fd = new FormData()
        fd.append("file", new Blob([this.props.pool.originalText]), "input.txt")

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

        let entities: {[key: string]: Entity} = {};
        for( let ent of resArray ){
            if( this.props.filters.some( f => ent.text.toLowerCase().indexOf(f.text.toLowerCase()) >= 0 ) ){
                continue;
            } 
            let id = normalizeEntityString(ent.text) + ent.label_
            if( !(id in entities) ){
                entities[id] = new Entity(ent.text, ent.label_);
            }
            entities[id].addOffset([{start: ent.start_char, end: ent.end_char-1}]) // Spacy has an endchar outside of entity
        }

        this.props.pool.entities = Object.values(entities).sort((a, b) => a.offsets[0].start-b.offsets[0].start)
        this.props.pool.updateOrder();
        this.setState({
            requested: false,
            text: "Sugerir"
        });
    }

    render(): React.ReactNode {
        return <button className="red-link fw-bold btn" onClick={this.runRemoteNlp} disabled={this.props.pool.entities.length > 0 || this.state.requested || this.props.disabled}><i className="bi bi-file-earmark-break"></i> {this.state.text}</button>;
    }
}