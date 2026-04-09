"use client";

import { useState, useEffect, useCallback } from "react";
import { CatchError } from "@/components/CatchError";
import Anonimize from "@/components/Anonimize/Main";
import Header from "@/components/Header";
import SelectFile from "@/components/SelectFile";
import { Banner } from "@/components/Banner";
import BootstrapModal from "@/core/BootstrapModal";
import { ProfileProvider, getProfile } from "@/core/ProfileTypeLogic";
import { UserFileInterface } from "@/types/UserFileInterface";
import { ProfileSelector } from "@/components/Anonimize/ProfileTypesTable";
import { ProfileI } from "@/types/ProfileType";

export default function ClientRoot() {
  const [userFile, setUserFile] = useState<UserFileInterface | undefined>();
  const [loading, setLoading] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onProfileChange = useCallback((profile: ProfileI | null) => {
    setUserFile(current => {
      current?.applyProfile(profile);
      return current;
    });
  }, []);

  const setUserFileProxy = (file: UserFileInterface | undefined) => {
    if (!file) {
      setUserFile(undefined);
      setLoading(false);
      try {
        delete (window as any).currentFile;
      } catch { }
    } else {
      setLoading(true);
      setTimeout(() => {
        const currentProfile = getProfile();
        if (currentProfile) file.applyProfile(currentProfile);
        setUserFile(file);
        (window as any).currentFile = file;
      }, 200);
    }
  };

  if (!mounted) return;

  return (
    <ProfileProvider onChange={onProfileChange}>
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

            <Banner />
          </>
        )}
      </div>
      <BootstrapModal id="modal-profile">
        <ProfileSelector />
      </BootstrapModal>
    </ProfileProvider>
  );
}
