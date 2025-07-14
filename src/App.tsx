import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { CatchError } from './CatchError';
import Anonimize from './components/Anonimize/Main';
import Header from './components/Header';
import SelectFile from './components/SelectFile';
import { UserFile } from './types/UserFile';
import { Banner } from './components/Banner';
import BootstrapModal from './util/BootstrapModal';
import { ProfileSelector } from './types/Profile';
import { Matomo } from './Matomo';

declare global {
  interface Window {
    currentFile: UserFile;
  }
}

function AnalyticsTracker() {
  const location = useLocation();
  useEffect(() => {
    const _paq = (window as any)._paq || [];
    _paq.push(['setCustomUrl', location.pathname + location.search]);
    _paq.push(['trackPageView']);
  }, [location]);
  return null;
}

function MainApp() {
  const [userFile, setUserFile] = useState<UserFile>();
  const [loading, setLoading] = useState<boolean>(false);

  const setUserFileProxy = (file?: UserFile) => {
    if (!file) {
      setUserFile(undefined);
      setLoading(false);
    } else {
      setLoading(true);
      setTimeout(() => {
        setUserFile(file);
        setLoading(false);
      }, 200);
      window.currentFile = file;
    }
  };

  return (
    <div className="App vh-100">
      {userFile ? (
        <CatchError userFile={userFile} setUserFile={setUserFileProxy}>
          <Anonimize setUserFile={setUserFileProxy} file={userFile} />
        </CatchError>
      ) : (
        <>
          <Header />
          {loading ? (
            <div className="container alert alert-info">
              <span className="spinner-border spinner-border-sm" role="status" />
              {' '}A preparar a aplicação...
            </div>
          ) : (
            <SelectFile setUserFile={setUserFileProxy} />
          )}
          <BootstrapModal id="modal-profile">
            <ProfileSelector />
          </BootstrapModal>
          <Banner />
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Matomo />

      <AnalyticsTracker />

      <Routes>
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  );
}
