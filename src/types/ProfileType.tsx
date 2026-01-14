import { ChangeEventHandler, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { isAnonimizeFunctionIndex } from "@/core/anonimizeFunctions";
import { Button } from "@/core/BootstrapIcons";
import { ProfileTypesTable } from "../components/Anonimize/ProfileTypesTable";
import { updateEntityTypeI } from "@/core/EntityTypeLogic";

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
