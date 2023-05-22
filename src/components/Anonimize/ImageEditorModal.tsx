import { useCallback, useEffect, useRef, useState } from "react";
import { UserFile } from "../../types/UserFile";
import BootstrapModal from "../../util/BootstrapModal";
import {ReactSketchCanvas} from "react-sketch-canvas"
import { Bicon, Button } from "../../util/BootstrapIcons";
import { AnonimizeImage } from "../../types/AnonimizeImage";
import { normalizeEntityString } from "../../types/Entity";


export function ImageEditorModal(props: {file: UserFile}){
    const preparingWorkerRef = useRef<boolean>(false);
    const workerRef = useRef<any>(null);
    if( !preparingWorkerRef.current ){
        preparingWorkerRef.current = true;

        const Tesseract = ((window as any).Tesseract! as any);
        Tesseract.createWorker().then( async (worker: any) => {
            if( !workerRef.current ){
                workerRef.current = worker;
                await worker.loadLanguage("por");
                await worker.initialize("por");
            }
        })
    }
    const [imageElmt, setImageElmt] = useState<HTMLImageElement>()

    const onShow = (elmt: HTMLElement | null) => {
        if( elmt?.tagName === "IMG" ){
            setImageElmt(elmt as HTMLImageElement)
        }
        else{
            setImageElmt(undefined)
        }
    }

    const onHide = () => setImageElmt(undefined)

    return <BootstrapModal id="modal-image-editor" onShow={onShow} onHide={onHide}>
        <div className="modal-body">
            <div className="modal-header">
                <div><h5 className="modal-title" id="modal-types-label">Anonimizar Imagem</h5></div>
            </div>
            <div className="modal-body">
                {imageElmt ? 
                <ImageEditor file={props.file} imageElmt={imageElmt} worker={workerRef.current} />
                :
                <>Selecione uma imagem para a editar</>
                }
            </div>
        </div>
    </BootstrapModal>
}

function ImageEditor(props: {file: UserFile, imageElmt: HTMLImageElement, worker: any}){
    let canvasBackgroundRef = useRef<HTMLCanvasElement>(null)
    let canvasForegroundRef = useRef<HTMLCanvasElement>(null)
    let ctxBackgroundRef = useRef<CanvasRenderingContext2D|null>(null)
    let ctxForegroundRef = useRef<CanvasRenderingContext2D|null>(null)
    let animFrameRequest = useRef<number>()
    let boxStart = useRef<number[]|null>(null)
    let mousePos = useRef<number[]|null>(null)
    let boxes = useRef<[number, number, number, number][]>([])
    let checkRemoveInput = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if( !canvasBackgroundRef.current ) return;
        if( !canvasForegroundRef.current ) return;

        ctxBackgroundRef.current = canvasBackgroundRef.current.getContext("2d");
        ctxForegroundRef.current = canvasForegroundRef.current.getContext("2d");
        
        if( !ctxBackgroundRef.current ) return;
        if( !ctxForegroundRef.current ) return;

        const ctx = setup(ctxBackgroundRef.current, ctxForegroundRef.current, props.file.images[parseInt(props.imageElmt.dataset.imageId!)])
        boxes.current = props.file.images[parseInt(props.imageElmt.dataset.imageId!)].boxes
        const _draw = () => {
            draw(ctxBackgroundRef.current!, ctxForegroundRef.current!, ctx, boxStart.current, mousePos.current, boxes.current)
            animFrameRequest.current = requestAnimationFrame(_draw)
        }
        animFrameRequest.current = requestAnimationFrame(_draw)

        return () => {
            cancelAnimationFrame(animFrameRequest.current!)
        }
    }, [props.imageElmt])

    const onMouseDown = (evt: React.MouseEvent) => {
        if( !canvasForegroundRef.current ) return;
        let rect = canvasForegroundRef.current?.getBoundingClientRect();
        let [mouseX, mouseY] = [evt.clientX-rect?.left, evt.clientY-rect?.top]
        boxStart.current = [mouseX, mouseY]
        mousePos.current = [mouseX, mouseY]
    }

    const onMouseMove = (evt: React.MouseEvent) => {
        if( !canvasForegroundRef.current ) return;
        let rect = canvasForegroundRef.current?.getBoundingClientRect();
        let [mouseX, mouseY] = [evt.clientX-rect?.left, evt.clientY-rect?.top]
        mousePos.current = [mouseX, mouseY]
    }

    const intersects: (r1: number[], r2: number[]) => boolean = (
        [r1TopLeftX, r1TopLeftY, r1BottomRightX, r1BottomRightY],
        [r2TopLeftX, r2TopLeftY, r2BottomRightX, r2BottomRightY],
    ) => (r1TopLeftX < r2BottomRightX) && (r1BottomRightX > r2TopLeftX) && (r1TopLeftY < r2BottomRightY) && (r1BottomRightY > r2TopLeftY)

    const onMouseUp = (evt: React.MouseEvent) => {
        if( !canvasForegroundRef.current ) return;
        let rect = canvasForegroundRef.current?.getBoundingClientRect();
        let [mouseX, mouseY] = [evt.clientX-rect?.left, evt.clientY-rect?.top]
        mousePos.current = [mouseX, mouseY]
        if( !boxStart.current ) return;
        let [initialX, initialY] = boxStart.current;
        if( checkRemoveInput.current?.checked ){
            boxes.current = boxes.current.filter(([x0,y0,x1,y1]) => !intersects([Math.min(mouseX, initialX),Math.min(mouseY, initialY),Math.max(mouseX,initialX),Math.max(mouseY, initialY)],[Math.min(x0, x1),Math.min(y0, y1),Math.max(x0,x1),Math.max(y0, y1)]));
        }
        else{
            boxes.current.push([initialX,initialY,mouseX,mouseY]);
        }
        boxStart.current = null;
    }

    const onClickSave = () => {
        props.file.images[parseInt(props.imageElmt.dataset.imageId!)].anonimizedSrc = canvasBackgroundRef.current?.toDataURL()
        props.file.images[parseInt(props.imageElmt.dataset.imageId!)].boxes = boxes.current
        props.file.notifyImages()
    }

    const onClickRestore = () => {
        boxes.current = []
        props.file.images[parseInt(props.imageElmt.dataset.imageId!)].anonimizedSrc = undefined
        props.file.images[parseInt(props.imageElmt.dataset.imageId!)].boxes = []
        props.file.notifyImages()
    }

    const onClickRecognize = async () => {
        let {data: {words}} = await props.worker.recognize(canvasBackgroundRef.current!)
        boxes.current = (props.file.pool.entities.length > 0 ? words.filter(({text}:any) => props.file.pool.entities.some(e => e.offsets.some(o => normalizeEntityString(o.preview).includes(normalizeEntityString(text)) ))) : words).filter(({text}: any) => text.length > 3).map(({bbox}: any) => [bbox.x0, bbox.y0, bbox.x1, bbox.y1])
    }


    return <>
        <div className="d-flex align-items-center justify-content-center">
            <Button className="btn btn-primary" i="search" text="Encontrar texto" onClick={onClickRecognize}/>
            <span className="mx-1">Modo:</span>
            <input type="radio" className="btn-check" name="options-outlined" id="success-outlined" autoComplete="off" checked />
            <label className="btn btn-outline-success" htmlFor="success-outlined"><Bicon n="pencil"/> Adicionar caixa</label>
            <input ref={checkRemoveInput} type="radio" className="btn-check" name="options-outlined" id="danger-outlined" autoComplete="off"/>
            <label className="btn btn-outline-danger" htmlFor="danger-outlined"><Bicon n="eraser"/> Apagar caixa</label>
        </div>
        <div style={{position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: "500px", margin: "10px"}}>
            <canvas ref={canvasBackgroundRef} style={{position: "absolute", border: "2px solid var(--secondary-gold)"}}/>
            <canvas ref={canvasForegroundRef} style={{position: "absolute", border: "2px solid var(--secondary-gold)"}} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}/>
        </div>
        <div className="d-flex">
            <div className="flex-grow-1"></div>
            <Button className="btn btn-danger mx-1" i="arrow-counterclockwise" text="Recomeçar" onClick={onClickRestore}/>
            <Button className="btn btn-success mx-1" i="save" text="Guardar e fechar" data-bs-dismiss="modal" onClick={onClickSave}/>
        </div>

    </>
}

function setup(backCtx: CanvasRenderingContext2D, foreCtx: CanvasRenderingContext2D, image: AnonimizeImage){
    let originalImage = new Image();
    originalImage.src = image.originalSrc;
    let anonimizedImage = null;
    if( image.anonimizedSrc ){
        anonimizedImage = new Image();
        anonimizedImage.src = image.anonimizedSrc;
    }
    originalImage.onload = () => {
        let c = 1;
        if( originalImage.height > 500 ){
            c = 500 / originalImage.height
        }
        backCtx.canvas.width = originalImage.width*c
        backCtx.canvas.height = originalImage.height*c
        foreCtx.canvas.width = originalImage.width*c
        foreCtx.canvas.height = originalImage.height*c
    }
    return originalImage
}

function draw(backCtx: CanvasRenderingContext2D, foreCtx: CanvasRenderingContext2D, originalImage: HTMLImageElement, boxStart: number[]|null, mousePos: number[]|null, boxes: number[][]){
    backCtx.clearRect(0,0,backCtx.canvas.width,backCtx.canvas.height)
    backCtx.fillStyle = "#ffffff"
    foreCtx.clearRect(0,0,foreCtx.canvas.width,foreCtx.canvas.height)
    foreCtx.strokeStyle = "#aaaaaa"
    foreCtx.fillStyle = "#aaaaaaaa"
    let c = 1;
    if( originalImage.height > 500 ){
        c = 500 / originalImage.height
    }
    backCtx.drawImage(originalImage, 0, 0, originalImage.width*c, originalImage.height*c)
    
    for( let box of boxes){
        backCtx.beginPath();
        foreCtx.beginPath();
        backCtx.moveTo(box[0], box[1])
        foreCtx.moveTo(box[0], box[1])
        backCtx.lineTo(box[0], box[3])
        foreCtx.lineTo(box[0], box[3])
        backCtx.lineTo(box[2], box[3])
        foreCtx.lineTo(box[2], box[3])
        backCtx.lineTo(box[2], box[1])
        foreCtx.lineTo(box[2], box[1])
        backCtx.fill();
        foreCtx.lineTo(box[0], box[1])
        foreCtx.stroke();
    }

    if( boxStart && mousePos ){
        foreCtx.beginPath();
        foreCtx.moveTo(boxStart[0], boxStart[1])
        foreCtx.lineTo(mousePos[0], boxStart[1])
        foreCtx.lineTo(mousePos[0], mousePos[1])
        foreCtx.lineTo(boxStart[0], mousePos[1])
        foreCtx.stroke()
        foreCtx.fill()
    }
}
