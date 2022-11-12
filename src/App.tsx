import React, { useState } from 'react';
import Anonimize from './components/Anonimize';
import SelectFile from './components/SelectFile';
import { UserFile } from './types/UserFile';

function App() {
  const [userFile, setUserFile] = useState<UserFile | undefined>(undefined);
  return (
    <div className="App">
      {userFile == null ? <SelectFile setUserFile={setUserFile} /> : <Anonimize setUserFile={setUserFile} file={userFile} />}
    </div>
  );
}

export default App;