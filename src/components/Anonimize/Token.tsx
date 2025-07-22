import { AnonimizeStateState } from "../../types/AnonimizeState"
import { EntityTypeI } from "../../types/EntityTypes"
import { SpecificOffsetRange } from "../../util/uses"


type AnonimizeTokenProps = {
    string: string
    offset: number
    type?: EntityTypeI
    anonimizeState: AnonimizeStateState
    specificOffset?: SpecificOffsetRange
}

export default function AnonimizeToken(props: AnonimizeTokenProps){
    let dataAttrs: {[_:string]: string} = {
        'data-offset': props.offset.toString()
    };
    
    if( props.specificOffset && props.type ){
        let type: EntityTypeI = props.type;
        dataAttrs['data-anonimize-cod'] = props.specificOffset.ent.anonimizingFunction(type)(props.specificOffset.preview, props.specificOffset.ent.type, props.specificOffset.ent.index, props.specificOffset.ent.typeIndex, props.specificOffset.ent.funcIndex);
        dataAttrs['data-anonimize-type'] = type.name;
        dataAttrs['data-anonimize-color'] = type.color;
        dataAttrs['data-anonimize-offset-start'] = props.specificOffset.start.toString()
        dataAttrs['data-anonimize-offset-end'] = props.specificOffset.end.toString()
        if( props.specificOffset.start === props.offset ){
            dataAttrs['data-anonimize-first'] = "true";
        }
        if(  props.offset === props.specificOffset.end-props.string.length+1 ){
            dataAttrs['data-anonimize-last'] = "true";
        }
    }

    switch(props.anonimizeState){
        case AnonimizeStateState.ANONIMIZED:
            if( 'data-anonimize-first' in dataAttrs ){
                return <>{dataAttrs['data-anonimize-cod']}</>;
            }
            else if( 'data-anonimize-cod' in dataAttrs ){
                return <></>
            }
            else{
                return <>{props.string}</>
            }
        case AnonimizeStateState.ORIGINAL:
            return <>{props.string}</>;
        case AnonimizeStateState.TAGGED:
            return <span {...dataAttrs}>{props.string}</span>;
        case AnonimizeStateState.OTHERS_TAGGED:
            if (props.type && props.type.name.startsWith("X")) {
                return <span {...dataAttrs}>{props.string}</span>;
            } else {
                return <>{props.string}</>;
            }
        case AnonimizeStateState.NORMAL_TAGGED:
            if (props.type && !props.type.name.startsWith("X")) {
                return <span {...dataAttrs}>{props.string}</span>;
            } else {
                return <>{props.string}</>;
            }
        default:
            return <></>;
    }   
}
