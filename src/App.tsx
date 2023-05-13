import React, { useState } from 'react';
import Anonimize from './components/Anonimize/Main';
import Header from './components/Header';
import SelectFile from './components/SelectFile';
import { UserFile } from './types/UserFile';

export default function App(props: {}){
	const [userFile, setUserFile] = useState<UserFile>();
	
	return <div className="App vh-100">
		{
			userFile ?
			<Anonimize setUserFile={setUserFile} file={userFile}/>
			: 
			<>
				<Header />
				<SelectFile setUserFile={setUserFile} />
			</>
		}
	</div>

}
