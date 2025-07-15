import { useState, useEffect } from 'react';
import { CatchError } from './CatchError';
import Anonimize from './components/Anonimize/Main';
import Header from './components/Header';
import SelectFile from './components/SelectFile';
import { UserFile } from './types/UserFile';
import { Banner } from './components/Banner';
import BootstrapModal from './util/BootstrapModal';
import { ProfileSelector } from './types/Profile';
import { useLocation } from 'react-router-dom';

declare global {
	interface Window {
		currentFile: UserFile;
		_paq: any[]; 
	}
}

export default function App(props: {}) {
	const location = useLocation();	
	useEffect(() => {
		window._paq = window._paq || [];
		window._paq.push(['setCustomUrl', window.location.href]);
		window._paq.push(['setDocumentTitle', document.title]);
		window._paq.push(['trackPageView']);
	}, [location]);

	const [userFile, setUserFile] = useState<UserFile>();
	const [loading, setLoading] = useState<boolean>();

	const setUserFileProxy = (file: UserFile | undefined) => {
		if (!file) {
			setUserFile(undefined);
			setLoading(false);
			window._paq.push(['trackEvent', 'File', 'clear', 'ClearedFileSelection',]);
		} else {
			window._paq.push(['setCustomUrl', `/file/${file.name}`]);
			window._paq.push(['setDocumentTitle', `Working on ${file.name}`]);
			window._paq.push(['trackPageView']);
			window._paq.push(['trackEvent', 'File', 'select', file.name]);
			setLoading(true);
			setTimeout(() => {
			setUserFile(file);
			}, 200);
			window.currentFile = file;
		}
		};

	return <div className="App vh-100">
		{
			userFile ?
				<CatchError userFile={userFile} setUserFile={setUserFileProxy}>
					<Anonimize setUserFile={setUserFileProxy} file={userFile} />
				</CatchError>
				:
				<>
					<Header />
					{loading ?
						<div className='container alert alert-info'><span className="spinner-border spinner-border-sm" role="status"></span> A preparar a aplicação...</div>
						:
						<SelectFile setUserFile={setUserFileProxy} />
					}
					<BootstrapModal id="modal-profile">
						<ProfileSelector />
					</BootstrapModal>
					<Banner />
				</>
		}
	</div>

}