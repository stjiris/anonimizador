import React from 'react'
import { AnonimizeStateState } from '../types/AnonimizeState'
import { Entity } from '../types/Entity'
import { EntityPool } from '../types/EntityPool'
import { EntityTypeI, getEntityType, getEntityTypes, TypeNames } from '../types/EntityTypes'
import { TokenSelection } from '../types/Selection'



export interface AnonimizeContentProps {
    doc: HTMLElement
    pool: EntityPool
    ents: Entity[]
    anonimizeState: AnonimizeStateState
}

export interface AnonimizeContentState {
    selection: TokenSelection | undefined
}

export default class AnonimizeContent extends React.Component<AnonimizeContentProps,AnonimizeContentState>{
    contentRef: React.RefObject<HTMLDivElement> = React.createRef();
    state: AnonimizeContentState = {
        selection: undefined
    }

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
                let text = Array.from(document.querySelectorAll(`[data-offset]`) as NodeListOf<HTMLElement>).filter((e: HTMLElement) => parseInt(e.dataset.offset || "-1") >= startOffset && parseInt(e.dataset.offset || "-1") < endOffset ).map(e => e.textContent).join("")
                this.setState({
                    selection: {
                        text: text,
                        start: startOffset,
                        end: endOffset-1
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
        /*
         TODO Several AnonimizaeTooltip
          - The current one allows to create more entities,
          - We need one to: remove current entiti(es) selected
          - ...
        */
        return <>
            <div id="content" ref={this.contentRef}>{list}</div>
            <AnonimizeTooltip 
                pool={this.props.pool}
                selection={this.state.selection}
            />
        </>
    }
}

interface AnonimizeBlockProps{
    element: ChildNode
    selection: TokenSelection | undefined
    offset: number
    ents: Entity[],
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
    ents: Entity[]
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
                if(offset.start <= this.props.offset && this.props.offset + this.props.string.length-1 <= offset.end){
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
            let type: EntityTypeI = getEntityType(isPartAnonimize.type);
            dataAttrs['data-anonimize-cod'] = isPartAnonimize.anonimizingFunction()(isPartAnonimize.previewText, isPartAnonimize.type, isPartAnonimize.index, isPartAnonimize.typeIndex);
            dataAttrs['data-anonimize-type'] = type.name;
            dataAttrs['data-anonimize-color'] = type.color;
            dataAttrs['data-anonimize-offset-start'] = isPartAnonimizeOffset.start.toString()
            dataAttrs['data-anonimize-offset-end'] = isPartAnonimizeOffset.end.toString()
            if( isPartAnonimizeOffset.start === this.props.offset ){
                dataAttrs['data-anonimize-first'] = "true";
            }
            if(  this.props.offset === isPartAnonimizeOffset.end-this.props.string.length+1 ){
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
                    return dataAttrs['data-anonimize-cod'];
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
    selection: TokenSelection | undefined
    pool: EntityPool
}

// <AnonimizeTooltip>
class AnonimizeTooltip extends React.Component<AnonimizeTooltipProps>{
    
    onClickType = (type: EntityTypeI, selection: TokenSelection) => {
        let NewEnt: Entity = new Entity(selection.text, type.name);
        NewEnt.addOffset([{...selection}])

        this.props.pool.addEntity(NewEnt);
    }

    onClickRemove = (selection: TokenSelection) => {
        this.props.pool.removeEntity(selection.start, selection.end)
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
                {getEntityTypes().map( (type,i) => 
                    <span key={i} role="button" style={{background: type.color}} onMouseDown={this.onClickType.bind(this, type, sel)}>{type.name}</span>
                )}
                <span role="button" className="bg-danger" onMouseDown={this.onClickRemove.bind(this, sel)}>Remover</span>
                <span role="button" className="bg-gray">Cancelar</span>
            </div>
        </div>
    }
}