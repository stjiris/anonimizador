import { useState } from 'react';
import { CatchError } from './CatchError';
import Anonimize from './components/Anonimize/Main';
import Header from './components/Header';
import SelectFile from './components/SelectFile';
import { UserFile } from './types/UserFile';
import { Banner } from './components/Banner';



export default function App(props: {}){
	const [userFile, setUserFile] = useState<UserFile>();
	const [loading, setLoading] = useState<boolean>();

	const setUserFileProxy = (file: UserFile | undefined) => {
		if( !file ){
			setUserFile(undefined)
			setLoading(false)
		}
		else{
			setLoading(true)
			setTimeout(() => {
				setUserFile(file)
			}, 200)
		}

	}
	
	return <div className="App vh-100">
		{
			userFile ?
				<CatchError userFile={userFile} setUserFile={setUserFileProxy}>
					<Anonimize setUserFile={setUserFileProxy} file={userFile}/>
				</CatchError>
			: 
			<>
				<Header />
				{loading ?
					<div className='container alert alert-info'><span className="spinner-border spinner-border-sm" role="status"></span> A preparar a aplicação...</div>
					: 
					<SelectFile setUserFile={setUserFileProxy} />
				}
				<Banner />
			</>
		}
	</div>

}