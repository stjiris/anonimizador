import { useMemo } from "react";
import { useState } from "react";
import { useEffect } from "react";
import { Entity, EntityI } from "@/types/Entity";
import { EntityPool } from "@/types/EntityPool";
import { Button } from "@/core/BootstrapIcons";

interface HistoryCommandsProps {
    pool: EntityPool
}


export function HistoryCommands({pool}: HistoryCommandsProps){
    const [{canGoBack, canGoFoward}, setCanGo] = useState<{canGoBack: string | null, canGoFoward: string | null}>({canGoBack: null, canGoFoward: null})
    const history = useMemo(() => new EntityHistory(pool, setCanGo), [pool, setCanGo])
    
    useEffect(() => {
        const keyDownEventHandler = (ev: KeyboardEvent) => handleKeyDown(ev, history)
        window.addEventListener("keydown", keyDownEventHandler)
        return () => {
            window.removeEventListener("keydown", keyDownEventHandler)
        }
    }, [pool, history])


    return <>
        <Button className="red-link m-1 p-1 btn" onClick={() => history.back()} disabled={!canGoBack} title={`Desfazer "${canGoBack}"`} i="arrow-counterclockwise"/>
        <Button className="red-link m-1 p-1 btn" onClick={() => history.forward()} disabled={!canGoFoward} title={`Refazer "${canGoFoward}"`} i="arrow-clockwise"/>
    </>
}

function handleKeyDown(event: KeyboardEvent, hist: EntityHistory){
    if (event.ctrlKey && event.code === 'KeyZ' && hist.canGoBack()) {
        hist.back();
    }
    else if (event.ctrlKey && event.code === 'KeyY' && hist.canGoFoward()) {
        hist.forward()
    }
}


class EntityHistory {
    history: {ents: EntityI[], actionName: string}[]
    index: number
    pool: EntityPool
    setCanGo: (can: {canGoBack: string | null, canGoFoward: string | null}) => void

    constructor(pool: EntityPool, setCanGo: (can: {canGoBack: string | null, canGoFoward: string | null}) => void){
        this.history = [{ents: pool.entities.map(o => o.toStub()), actionName: "Inicial"}];
        this.index = 0;
        this.pool = pool;
        this.setCanGo = setCanGo;
        pool.onChange(this.onChangePool.bind(this));
    }

    onChangePool(ch: string){
        if( ch !== EntityHistory.BACK && ch !== EntityHistory.FORWARD ){
            this.push(ch)
        }
    }

    close(){
        this.pool.offChange(this.onChangePool.bind(this))
    }

    push(change: string, initial: boolean=false){
        let stubs = {ents: this.pool.entities.map(o => o.toStub()), actionName: change};
        if( initial ){
            this.history = [stubs]
            this.index = 0
        }
        else{
            if( this.index < this.history.length-1 ){ // if not in end of array replace history
                this.history.splice(this.index+1, Infinity, stubs)
            }
            else{
                this.history.push(stubs)
            }
            this.index++;
        }
        this.setCanGo({canGoBack: this.canGoBack(), canGoFoward: this.canGoFoward()})
    }

    canGoBack(){
        return this.index > 0 ? this.history[this.index].actionName : null
    }

    back(){
        if( this.canGoBack() ){
            this.index--;
            this.pool.entities = this.history[this.index].ents.map( (o, i) => Entity.makeEntity(o, i))
            this.pool.updateOrder(EntityHistory.BACK);
        }
        this.setCanGo({canGoBack: this.canGoBack(), canGoFoward: this.canGoFoward()})
    }

    canGoFoward(){
        return this.index < this.history.length - 1 ? this.history[this.index+1].actionName : null
    }

    forward(){
        if( this.canGoFoward() ){
            this.index++;
            this.pool.entities = this.history[this.index].ents.map( (o, i) => Entity.makeEntity(o, i))
            this.pool.updateOrder(EntityHistory.FORWARD);
        }
        this.setCanGo({canGoBack: this.canGoBack(), canGoFoward: this.canGoFoward()})
    }

    static BACK = "Back"
    static FORWARD = "Forward"
}
