import { useState } from "react";
import { useEffect, useRef } from "react";
import { Entity, EntityI } from "../../types/Entity";
import { EntityPool } from "../../types/EntityPool";
import { Button } from "../../util/BootstrapIcons";

interface HistoryCommandsProps {
    pool: EntityPool
}


export function HistoryCommands({pool}: HistoryCommandsProps){
    const [{canGoBack, canGoFoward}, setCanGo] = useState<{canGoBack: boolean, canGoFoward: boolean}>({canGoBack: false, canGoFoward: false})
    const history = new EntityHistory(pool, setCanGo);
    
    useEffect(() => {
        const keyDownEventHandler = (ev: KeyboardEvent) => handleKeyDown(ev, history)
        window.addEventListener("keydown", keyDownEventHandler)
        return () => window.removeEventListener("keydown", keyDownEventHandler)
    }, [])


    return <>
        <Button className="red-link m-1 p-1 btn" onClick={() => history.back()} disabled={!canGoBack} title="Desfazer" i="arrow-counterclockwise"/>
        <Button className="red-link m-1 p-1 btn" onClick={() => history.forward()} disabled={!canGoFoward} title="Refazer" i="arrow-clockwise"/>
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
    history: EntityI[][]
    index: number
    pool: EntityPool
    setCanGo: (can: {canGoBack: boolean, canGoFoward: boolean}) => void

    constructor(pool: EntityPool, setCanGo: (can: {canGoBack: boolean, canGoFoward: boolean}) => void){
        this.history = [pool.entities.map(o => o.toStub())];
        this.index = 0;
        this.pool = pool;
        this.setCanGo = setCanGo;
        pool.onChange((ch) => ch != EntityHistory.BACK && ch != EntityHistory.FORWARD && this.push())
    }

    push(initial: boolean=false){
        let stubs = this.pool.entities.map(o => o.toStub());
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
        return this.index > 0
    }

    back(){
        if( this.canGoBack() ){
            this.index--;
            this.pool.entities = this.history[this.index].map( (o, i) => Entity.makeEntity(o, i))
            this.pool.updateOrder(EntityHistory.BACK);
        }
        this.setCanGo({canGoBack: this.canGoBack(), canGoFoward: this.canGoFoward()})
    }

    canGoFoward(){
        return this.index < this.history.length - 1
    }

    forward(){
        if( this.canGoFoward() ){
            this.index++;
            this.pool.entities = this.history[this.index].map( (o, i) => Entity.makeEntity(o, i))
            this.pool.updateOrder(EntityHistory.FORWARD);
        }
        this.setCanGo({canGoBack: this.canGoBack(), canGoFoward: this.canGoFoward()})
    }

    static BACK = "Back"
    static FORWARD = "Forward"
}
