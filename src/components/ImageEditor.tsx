


/*export function ImageEditor(){
    return <div className='canvas' style={{visibility: this.state.image.id != null ? "visible" : "hidden"}}>
                    <div className='canvasButtons'>
                        <Button id="imageUndoButton" className="red-link fw-bold btn" onClick={undoImage} title="Desfazer" i="arrow-counterclockwise"/>
                        <Button id="imageUndoButton" className="red-link fw-bold btn" onClick={() => toggleErasor(true)} title="Apagar" i="bi bi-eraser"/>
                        <Button id="imageUndoButton" className="red-link fw-bold btn" onClick={() => toggleErasor(false)} title="Escrever" i="bi bi-pencil"/>
                        <Button id="imageRedoButton" className="red-link fw-bold btn" onClick={redoImage} title="Refazer" i="arrow-clockwise"/>
                    </div>
                    <ReactSketchCanvas
                        ref={this.canvasRef}
                        backgroundImage={this.state.image.src}
                        width={this.state.image.width}
                        height={this.state.image.height}
                        strokeWidth={4}
                        strokeColor="black"
                    />
                    <div className='canvasButtons'>
                        <button type="button" onClick={resetImage} className="btn btn-danger">Recomeçar</button>
                        <button type="button" onClick={cancelImage} className="btn btn-warning">Cancelar</button>
                        <button type="button" onClick={saveImage} className="btn btn-primary">Gravar</button>
                    </div>
                </div>
}*/