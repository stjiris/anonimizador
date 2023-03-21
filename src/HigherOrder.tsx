import React, {useRef, useEffect} from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import cloneDeep from 'lodash/cloneDeep';

export default function HigherOrder () {
  const savedStates = useRef<any>([[]]);
  const stateIndex = useRef<number>(0);
  const maxStateIndex = useRef<number>(0);
  const listSize = useRef<number[]>([]);
  const offsetIndex = useRef<{[key: number]: number}>({});

  useEffect(() => {
    function handleUndoKeyDown(event: any) {
      if (event.ctrlKey && event.code === 'KeyZ') {
        document.getElementById('undoButton')!.click();
      }
    }
    function handleRedoKeyDown(event: any) {
      if (event.ctrlKey && event.code === 'KeyY') {
        document.getElementById('redoButton')!.click();
      }
    }

    document.addEventListener('keydown', handleUndoKeyDown);
    document.addEventListener('keydown', handleRedoKeyDown);

    return () => {
      document.removeEventListener('keydown', handleUndoKeyDown);
      document.removeEventListener('keydown', handleRedoKeyDown);
    };
  }, []);

  const saveSateCallback = (state: any, first: boolean) => {

    if (first) {
      savedStates.current = [cloneDeep(state)];
      stateIndex.current = 0;
      maxStateIndex.current = 0;
    }
    else {
      // If we are not at the end of the array, we need to remove the states after the current one
      if(stateIndex.current < maxStateIndex.current ){
        savedStates.current = savedStates.current.slice(0, stateIndex.current+1);
        maxStateIndex.current = stateIndex.current;
      }
  
      stateIndex.current = stateIndex.current+1;
      maxStateIndex.current = maxStateIndex.current+1;
  
      let newState = cloneDeep(state);
  
      savedStates.current.push(newState)
    }
  }

  const undoRedoCallback = (index: number) => {
    let i = Math.max(index,0)
    i = Math.min(i, maxStateIndex.current)
    stateIndex.current = i;
    return savedStates.current[i];
  }


  return (
    <App saveSateCallback={saveSateCallback} undoRedoCallback={undoRedoCallback} stateIndex={stateIndex} maxStateIndex={maxStateIndex} listSize={listSize.current} offsetIndex={offsetIndex.current}/>
  )
}