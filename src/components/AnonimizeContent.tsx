import React from 'react'
import { AnonimizeStateState } from '../types/AnonimizeState'
import { AnonimizableEnt, EntType } from '../types/EntType'
import { TokenSelection } from '../types/Selection'



export interface AnonimizeContentProps {
    doc: HTMLElement
    ents: AnonimizableEnt[]
    types: EntType[]
    onEntity: (ent: AnonimizableEnt) => void
    anonimizeState: AnonimizeStateState
}

export interface AnonimizeContentState {
    selection: TokenSelection | undefined
}

export default class AnonimizeContent extends React.Component<AnonimizeContentProps,AnonimizeContentState>{
    contentRef: React.RefObject<HTMLDivElement> = React.createRef();
    state: AnonimizeContentState = { selection: undefined }

    updateSelection = (ev: MouseEvent) => {
        let sel = window.getSelection();
        if( !sel || sel.isCollapsed ){
            sel = null
        }
        else{
            let commonAncestorContainer = sel.getRangeAt(0).commonAncestorContainer;
            if( !commonAncestorContainer.contains(this.contentRef.current) && !this.contentRef.current?.contains(commonAncestorContainer) ){
                sel = null
            }
        }
        if( sel !== null ){
            let startOffset = parseInt(sel.getRangeAt(0).startContainer.parentElement?.dataset.offset || "-1");
            let endOffset = parseInt(sel.getRangeAt(0).endContainer.parentElement?.dataset.offset || "-1") + (sel.getRangeAt(0).endContainer.parentElement?.textContent?.length || 0);
            if( startOffset >= 0 && endOffset >= 0){
                let text = "";
                for(let i = startOffset; i <= endOffset; i++){
                    text += document.querySelector(`[data-offset="${i}"]`)?.textContent || ""
                }
                this.setState({
                    selection: {
                        text: text,
                        start: startOffset,
                        end: endOffset
                    }
                })
            }
            else{
                sel = null;
            }
        }

        if( this.state.selection !== null && sel === null ){
            this.setState({selection: undefined})
        }
    }

    componentDidMount(): void {
        window.addEventListener("mouseup", this.updateSelection)
    }
    componentWillUnmount(): void {
        window.removeEventListener("mouseup", this.updateSelection)
    }

    render(): React.ReactNode {
        let list = [];
        let offset = 0;
        for(let i=0; i < this.props.doc.childNodes.length; i++){
            list.push(<AnonimizeBlock key={i} selection={this.state.selection} element={this.props.doc.childNodes[i]} offset={offset} ents={this.props.ents} anonimizeState={this.props.anonimizeState}/>)
            offset += (this.props.doc.childNodes[i].textContent || "").length;
        }
        return <>
            <div id="content" ref={this.contentRef}>{list}</div>
            <AnonimizeTooltip 
                addEntity={this.props.onEntity}
                selection={this.state.selection}
                types={this.props.types}
            />
        </>
    }
}

interface AnonimizeBlockProps{
    element: ChildNode
    selection: TokenSelection | undefined
    offset: number
    ents: AnonimizableEnt[],
    anonimizeState: AnonimizeStateState
}

class AnonimizeBlock extends React.Component<AnonimizeBlockProps>{
    blockRef: React.RefObject<any> = React.createRef();
    render(): React.ReactNode {
        let elmt = this.props.element;

        if( elmt.nodeType === Node.TEXT_NODE ){
            let elmtStr = elmt.nodeValue || ""; // should never be null tho...
            let tokensElems = [];
            let suboffset = 0;
            let tokens = elmtStr.split(/(?=[^A-Za-zÀ-ÖØ-öø-ÿ0-9])|(?<=[^A-Za-zÀ-ÖØ-öø-ÿ0-9])/);
            for( let token of tokens ){
                tokensElems.push(<AnonimizeToken key={suboffset} string={token} selection={this.props.selection} offset={this.props.offset+suboffset} ents={this.props.ents} anonimizeState={this.props.anonimizeState} />);
                suboffset+=token.length;
            }
            return tokensElems;
        }

        let Tag = elmt.nodeName.toLowerCase();
        let elmtElmt: HTMLElement = elmt as HTMLElement;

        let r = [];
        let suboffset = 0;
        for(let i = 0; i < elmt.childNodes.length; i++){
            r.push(<AnonimizeBlock key={i} selection={this.props.selection} element={elmt.childNodes[i]} offset={this.props.offset + suboffset} ents={this.props.ents} anonimizeState={this.props.anonimizeState}/>)
            suboffset += (elmt.childNodes[i].textContent || "").length
        }
        
        let attrs: any  = {};
        for(let attr of elmtElmt.getAttributeNames()){
            attrs[attr] = elmtElmt.getAttribute(attr);
        }
        if( 'style' in attrs ){
            let s = attrs['style'];
            delete attrs['style'];
            attrs['STYLE'] = s; // style should be a JS objecy, STYLE gives warning but its not intercepted
        }
        
        if( 'class' in attrs ){
            let c = attrs['class'];
            delete attrs['class'];
            attrs['className'] = c;
        }

        if( Tag === 'a' && attrs['href'] && !attrs['href'].startsWith('#')){
            attrs['target'] = '_blank'; // prevent user to exit page
        }

        attrs["ref"] = this.blockRef;

        if( r.length === 0 ){
            return React.createElement(Tag, attrs);
        }
        else{
            return React.createElement(Tag, attrs, r);
        }
    }
}

type AnonimizeTokenProps = {
    string: string
    selection: TokenSelection | undefined
    offset: number
    ents: AnonimizableEnt[]
    anonimizeState: AnonimizeStateState
}

class AnonimizeToken extends React.Component<AnonimizeTokenProps>{
    render(): React.ReactNode {
        // User Selected
        let selected = this.props.selection && this.props.offset >= this.props.selection.start && this.props.offset <= this.props.selection.end;

        // Token Anonimized
        let isPartAnonimize = null; 
        let isPartAnonimizeOffset = null;
        for( let ent of this.props.ents ){
            for(let offset of ent.offsets){
                if(offset.start <= this.props.offset && this.props.offset + this.props.string.length <= offset.end){
                    isPartAnonimizeOffset = offset;
                    isPartAnonimize = ent;
                    break;
                }
            }
            if( isPartAnonimize ){
                break
            }
        }

        let dataAttrs: {[_:string]: string} = {
            'data-offset': this.props.offset.toString()
        };

        
        if( isPartAnonimize && isPartAnonimizeOffset ){
            dataAttrs['data-anonimize-cod'] = isPartAnonimize.cod;
            dataAttrs['data-anonimize-type'] = isPartAnonimize.type.name;
            dataAttrs['data-anonimize-color'] = isPartAnonimize.type.color;
            dataAttrs['data-anonimize-offset-start'] = isPartAnonimizeOffset.start.toString()
            dataAttrs['data-anonimize-offset-end'] = isPartAnonimizeOffset.end.toString()
            if( isPartAnonimizeOffset.start === this.props.offset ){
                dataAttrs['data-anonimize-first'] = "true";
            }
            if(  this.props.offset === isPartAnonimizeOffset.end-this.props.string.length ){
                dataAttrs['data-anonimize-last'] = "true";
            }
        }

        /*if( isPartAnonimize ){
            if( dataAttrs['data-anonimize-first'] === "true" ){
            }
            else{
                return <span>{this.props.string}</span>;
            }
        }
        else{
            return <span>{this.props.string}</span>;
        }*/

        switch(this.props.anonimizeState){
            case AnonimizeStateState.ANONIMIZED:
                if( isPartAnonimize && 'data-anonimize-first' in dataAttrs ){
                    return isPartAnonimize.cod;
                }
                else if( isPartAnonimize ){
                    return ""
                }
                else{
                    return this.props.string
                }
            case AnonimizeStateState.ORIGINAL:
                return this.props.string;
            case AnonimizeStateState.TAGGED:
                return <span className={selected ? 'selected' : ''} {...dataAttrs}>{this.props.string}</span>;
            default:
                return "";
        }
    }
}

interface AnonimizeTooltipProps {
    types: EntType[]
    selection: TokenSelection | undefined
    addEntity: (ent: AnonimizableEnt) => void
}

// <AnonimizeTooltip>
class AnonimizeTooltip extends React.Component<AnonimizeTooltipProps>{
    onClick = (type: EntType, selection: TokenSelection) => {
        let NewEnt: AnonimizableEnt = {
            cod: "AAA",
            offsets: [{
                ...selection
            }],
            text: selection.text,
            type: type
        }

        this.props.addEntity(NewEnt);
        console.log(NewEnt)
    }

    render(): React.ReactNode {
        if( !this.props.selection ){
            return "";
        } 
        let sel = this.props.selection;
        let start = document.querySelector(`[data-offset="${sel.start}"]`);
        if(!start) return;
        let rects = start.getClientRects();

        let style: React.CSSProperties = {
            position: "fixed",
            display: "block",
            top: rects[0].top + rects[0].height,
            left: rects[0].right,
            width: "fit-content"
        };
        return <div style={style}>
            <div className="d-flex flex-column gap-1 bg-white p-1 border">
                {this.props.types.map( (o,i) => 
                    <span key={i} role="button" style={{background: o.color}} onMouseDown={this.onClick.bind(this, o, sel)}>{o.name}</span>
                )}
                <span role="button" className="bg-danger">Cancelar</span>
            </div>
        </div>
    }
}