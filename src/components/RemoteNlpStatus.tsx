import React from "react";
import { AnonimizableEnt } from "../types/EntType";

interface RemoteNlpStatusProps {
    onEntity: (ent: AnonimizableEnt) => void
    doc: HTMLElement
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

        let resArray = await fetch("/from-text", {
            method: "POST",
            body: fd
        }).then( r => r.json() )

        for( let ent of resArray ){
            this.props.onEntity({
                cod: "AAA",
                text: ent.text,
                type: {name: ent.label_, color: "red"},
                offsets: [{
                    start: ent.start_char,
                    end: ent.end_char
                }]
            })
        }
    }

    render(): React.ReactNode {
        return !this.state.requested ? <button className="red-link fw-bold" onClick={this.runRemoteNlp}>Sugerir</button> : <>Sugerido</>;
    }
}