"use client";

import { useState, useEffect } from "react";
import { CatchError } from "@/components/CatchError";
import Anonimize from "@/components/Anonimize/Main";
import Header from "@/components/Header";
import SelectFile from "@/components/SelectFile";
import { Banner } from "@/components/Banner";
import BootstrapModal from "@/client-utils/BootstrapModal";
import { ProfileProvider, ProfileSelector } from "@/client-utils/ProfileTypeLogic";
import { UserFileInterface } from "@/types/UserFile";

export default function ClientRoot() {
  const [userFile, setUserFile] = useState<UserFileInterface | undefined>();
  const [loading, setLoading] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const setUserFileProxy = (file: UserFileInterface | undefined) => {
    if (!file) {
      setUserFile(undefined);
      setLoading(false);
      try {
        delete (window as any).currentFile;
      } catch {}
    } else {
      setLoading(true);
      setTimeout(() => {
        setUserFile(file);
        (window as any).currentFile = file;
      }, 200);
    }
  };

  if (!mounted) return ;

  return (
    <ProfileProvider>
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
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                />{" "}
                A preparar a aplicação...
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
    </ProfileProvider>
  );
}
