import { ChangeEventHandler, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { isAnonimizeFunctionIndex } from "@/client-utils/anonimizeFunctions";
import { Button } from "@/client-utils/BootstrapIcons";
import { ProfileTypesTable } from "../components/Anonimize/ProfileTypesTable";
import { updateEntityTypeI } from "@/client-utils/EntityTypeLogic";

export interface ProfileI {
    name: string,
    tools: {
        sumarizador?: boolean,
        descritores?: boolean,
    },
    nerRgx: {
        nerOn?: boolean,
        rgxOn?: boolean,
    },
    defaultEntityTypes: {
        [key: string]: {
            color: string,
            functionIndex: number,
        }
    }
}
