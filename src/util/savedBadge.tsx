import { useEffect } from "react"
import { Bicon } from "./BootstrapIcons"

export function SavedBadge(props: {saved: boolean, name: string}){
    useEffect(() => {
        if( !props.saved ) {
            alert("Atenção! O trabalho não será guardado automáticamente")
        }
    }, [props.saved])
    if( props.saved ){
        return <span title="Guardado automaticamente." className="text-body text-nowrap alert alert-success p-1 m-1"><Bicon n="file-earmark-check-fill"/> <small>{props.name}</small></span>
    }
    else{
        return <span title="Não guardado." className="text-body text-nowrap alert alert-danger p-1 m-1"><Bicon n="file-earmark-x-fill"/> <small>{props.name}</small></span>
    }
}