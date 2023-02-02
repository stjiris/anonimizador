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
        this.setState({
            requested: true,
            messages: []
        })
        let loc = window.location
        let new_uri;
        if (loc.protocol === "https:") {
            new_uri = "wss:";
        } else {
            new_uri = "ws:";
        }
        new_uri += "//" + loc.host.replace(":3000",":7998") // replace the explicit react port 3000 for proxy (if no port replace will do nothing)
        let path = "runnlp";
        if( !loc.pathname.endsWith("/") ){
            path = "/runnlp";
        }
        new_uri += loc.pathname + path;
        let ws = new WebSocket(new_uri);

        let currOffset = 0;
        let currIndex = 0;

        ws.onmessage = (ev) => {
            let data = JSON.parse(ev.data);
            switch (data.type) {
                case "Protocol":
                    switch (data.message){
                        case "Await input":
                            if( currIndex >= this.props.doc.childNodes.length ){
                                return ws.close();
                            } 
                            let text = this.props.doc.childNodes[currIndex].textContent || "";
                            
                            ws.send(JSON.stringify({ text, offset: currOffset}))
        
                            currIndex++;
                            currOffset += text.length;
                            break;
                        default:
                            break;
                    }
                    break;
                case "Info":
                    this.setState({messages: this.state.messages.concat(`${data.date}: ${data.message}`)})
                    break;
                case "Entity":
                    this.props.onEntity({
                        cod: "AAA",
                        text: data.message.text,
                        type: {name: data.message.label, color: "red"},
                        offsets: [{
                            start: data.message.start,
                            end: data.message.end
                        }]
                    })
                    break;
                default:
                    break;
            }
        }
        ws.onerror = () => {
            this.setState({requested: false})
        }
        ws.onclose = () => {
            this.setState({requested: false})
        }
    }

    render(): React.ReactNode {
        return !this.state.requested ? <button className="red-link fw-bold" onClick={this.runRemoteNlp}>Sugerir</button> :
            <div>
                {this.state.messages.map( o => <pre><code>{JSON.stringify(o)}</code></pre>)}
            </div>;
    }
}