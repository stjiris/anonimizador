import { AnonimizeImage, SaveAnonimizeImage } from "@/types/AnonimizeImage"
import { DescriptorI } from "@/types/DescriptorType"
import { EntityPool } from "@/types/EntityPool"
import { Entity, EntityI, EntityTypeFunction, EntityTypeI } from "@/types/EntityType"
import { SummaryI } from "@/types/SummaryType"
import { addEntityTypeI, getEntityTypeI, getEntityTypeIs, restoreEntityTypesColors, updateEntityTypeI } from "./EntityTypeLogic"
import { ProfileI } from "@/types/ProfileType"
import { updateUserFile } from "./UserFileCRUDL"
import { AUTO_ANONIMIZE } from "./anonimizeFunctions"
import { UserFileInterface } from "@/types/UserFileInterface";

export interface SavedUserFile {
    name: string
    html_contents: string
    functions: (EntityTypeFunction & { subtypes?: EntityTypeI[] })[]
    ents: EntityI[]
    imported: string
    modified: string
    images: Record<number, SaveAnonimizeImage>
    lastTopPosition?: number
    descriptors?: DescriptorI[]
    summary?: SummaryI[]
    area?: string
    profile?: string
    jurisId?: string
    jurisDocUrl?: string
}

export class UserFile implements UserFileInterface {
    name: string
    html_contents: string
    types: EntityTypeI[]
    pool: EntityPool
    images: Record<number, AnonimizeImage>
    imported: Date
    modified: Date
    lastTopPosition: number
    area?: string
    descriptors?: DescriptorI[]
    summary?: SummaryI[]
    profile?: string
    jurisId?: string
    jurisDocUrl?: string

    typesListeners: ((types: EntityTypeI[]) => void)[]

    savedListeners: ((saved: boolean) => void)[]

    imagesListeners: ((images: Record<number, AnonimizeImage>) => void)[]

    areaListeners: ((area?: string) => void)[]

    descriptorsListeners: ((descriptors: DescriptorI[]) => void)[]

    summaryListeners: ((summary: SummaryI[]) => void)[]

    saved: boolean
    doc: HTMLElement;

    constructor(obj: SavedUserFile) {
        this.name = obj.name
        this.html_contents = obj.html_contents
        this.types = obj.functions.map(f => {
            const globalType = getEntityTypeI(f.name);
            return {
                color: globalType.color,
                name: f.name,
                functionIndex: f.functionIndex,
                subtypes: globalType.subtypes ?? f.subtypes
            };
        })
        this.imported = new Date(obj.imported)
        this.modified = new Date(obj.modified)

        let dom = new DOMParser().parseFromString(this.html_contents, "text/html");
        this.doc = dom.body;

        const text = this.doc.textContent;
        this.pool = new EntityPool(text || "", obj.ents.map((e, i) => Entity.makeEntity(e, i)))
        this.pool.onChange(() => this.save());

        this.typesListeners = []

        let images = Array.from(dom.getElementsByTagName("img") as HTMLCollectionOf<HTMLImageElement>)

        this.images = {};
        images.forEach((img, i) => {
            this.images[i] = {
                originalSrc: img.src,
                anonimizedSrc: obj.images[i] ? obj.images[i].anonimizedSrc : undefined,
                boxes: obj.images[i] ? obj.images[i].boxes : [],
                boxColor: obj.images[i] ? obj.images[i].boxColor : "#ffffff"
            }
        })

        this.imagesListeners = []

        this.areaListeners = []
        this.descriptorsListeners = []
        this.summaryListeners = []

        this.savedListeners = []

        this.lastTopPosition = obj.lastTopPosition || 0;

        this.descriptors = obj.descriptors;
        this.area = obj.area;
        this.summary = obj.summary;
        this.jurisId = obj.jurisId;
        this.jurisDocUrl = obj.jurisDocUrl;

        this.saved = false
        this.save()
    }

    toSavedFile(): SavedUserFile {
        let savedImages = {} as Record<number, SaveAnonimizeImage>;
        Object.entries(this.images).forEach(([key, img]) => savedImages[parseInt(key)] = { anonimizedSrc: img.anonimizedSrc, boxes: img.boxes, boxColor: img.boxColor });
        return {
            name: this.name,
            html_contents: this.html_contents,
            functions: this.types.map(t => ({ name: t.name, functionIndex: t.functionIndex, subtypes: t.subtypes })),
            ents: this.pool.entities.map(e => e.toStub()),
            imported: this.imported.toString(),
            modified: this.modified.toString(),
            images: savedImages,
            lastTopPosition: this.lastTopPosition,
            area: this.area,
            descriptors: this.descriptors,
            summary: this.summary,
            profile: this.profile,
            jurisId: this.jurisId,
            jurisDocUrl: this.jurisDocUrl,
        }
    }

    async save(): Promise<boolean> {
        this.modified = new Date();

        const saved = await updateUserFile(this.toSavedFile())

        this.notifySave(saved);

        return this.saved = saved
    }

    notifySave(saved: boolean) {
        for (let cb of this.savedListeners) {
            cb(saved);
        }
    }

    onSave(cb: (saved: boolean) => void) {
        this.savedListeners.push(cb);
    }

    offSave(cb: (saved: boolean) => void) {
        let idx = this.savedListeners.findIndex((fn) => fn === cb);
        if (idx >= 0) {
            this.savedListeners.splice(idx, 1)
        }
    }

    addType(key: string, color: string, funcIndex: number, subtypes?: EntityTypeI[]) {
        if (this.types.some(t => t.name === key)) {
            return this.updateType(key, color, funcIndex)
        }

        addEntityTypeI(key, color, funcIndex, subtypes)
        this.types.push({ name: key, color: color, functionIndex: funcIndex, subtypes: subtypes })
        this.notifyType()
        this.save()
    }

    updateType(key: string, color: string, funcIndex: number, subtypes?: EntityTypeI[]) {
        let updated = false;
        for (let t of this.types) {
            if (t.name === key) {
                updated = color !== t.color || t.functionIndex !== funcIndex
                t.color = color;
                t.functionIndex = funcIndex;
                t.subtypes = subtypes
                break;
            }
        }
        if (updated) {
            updateEntityTypeI(key, color, funcIndex, subtypes)
            this.notifyType()
            this.save()
        }
    }

    deleteType(key: string) {
        if (this.pool.entities.some(e => e.type === key)) {
            return alert("Não foi possível remover o tipo. Existem entidades com este tipo.");
        }
        this.types = this.types.filter(t => t.name !== key)
        this.notifyType();
        this.save()
    }

    resetTypes() {
        let colors = restoreEntityTypesColors();
        const types = {} as Record<string, true>;
        for (let e of this.pool.entities) {
            types[e.type] = true;
        }
        for (let c of colors) {
            types[c.name] = true
        }
        this.types = Object.keys(types).map(k => getEntityTypeI(k)) // if there is a personalized type getEntityTypeIs alone will be incompleted
        this.notifyType()
        this.save()
    }

    notifyType() {
        for (let cb of this.typesListeners) {
            cb([...this.types]);
        }
    }

    onTypes(cb: (types: EntityTypeI[]) => void) {
        this.typesListeners.push(cb);
    }

    offTypes(cb: (types: EntityTypeI[]) => void) {
        let idx = this.typesListeners.findIndex((fn) => fn === cb);
        if (idx >= 0) {
            this.savedListeners.splice(idx, 1)
        }
    }

    onImages(cb: (images: Record<number, AnonimizeImage>) => void) {
        this.imagesListeners.push(cb);
    }

    offImages(cb: (images: Record<number, AnonimizeImage>) => void) {
        let idx = this.imagesListeners.findIndex((fn) => fn === cb);
        if (idx >= 0) {
            this.savedListeners.splice(idx, 1)
        }

    }

    notifyImages() {
        for (let cb of this.imagesListeners) {
            cb({ ...this.images });
        }
    }

    onDescriptors(cb: (descriptors: DescriptorI[]) => void) {
        this.descriptorsListeners.push(cb);
    }

    offDescriptors(cb: (descriptors: DescriptorI[]) => void) {
        let idx = this.descriptorsListeners.findIndex((fn) => fn === cb);
        if (idx >= 0) {
            this.savedListeners.splice(idx, 1)
        }
    }

    notifyDescriptors() {
        for (let cb of this.descriptorsListeners) {
            cb(this.descriptors || []);
        }
    }

    onArea(cb: (area?: string) => void) {
        this.areaListeners.push(cb);
    }

    offArea(cb: (area?: string) => void) {
        let idx = this.areaListeners.findIndex((fn) => fn === cb);
        if (idx >= 0) {
            this.savedListeners.splice(idx, 1)
        }
    }

    notifyArea() {
        for (let cb of this.areaListeners) {
            cb(this.area);
        }
    }

    onSummary(cb: (summary: SummaryI[]) => void) {
        this.summaryListeners.push(cb);
    }

    offSummary(cb: (summary: SummaryI[]) => void) {
        let idx = this.summaryListeners.findIndex((fn) => fn === cb);
        if (idx >= 0) {
            this.savedListeners.splice(idx, 1)
        }
    }

    notifySummary() {
        for (let cb of this.summaryListeners) {
            cb(this.summary || []);
        }
    }

    applyProfile(profile: ProfileI | null) {
        this.profile = profile?.name;
        if (!profile) {
            this.notifyType();
            this.save();
            return;
        }
        for (const [name, { color, functionIndex, subtypes }] of Object.entries(profile.defaultEntityTypes)) {
            const existing = this.types.find(t => t.name === name);
            if (existing) {
                existing.color = color;
                existing.functionIndex = functionIndex;
                existing.subtypes = subtypes;
            } else {
                this.types.push({ name, color, functionIndex, subtypes });
            }
            updateEntityTypeI(name, color, functionIndex, subtypes);
        }
        this.notifyType();
        this.save();
    }

    checkCountPES() {
        if (this.profile == "STJ - Principal") {

            let PES_count = this.pool.countPES;

            if (PES_count > 26) { //Checks if there are over 26 entities of type PES;
                this.updateType("PES", "#00e2ff", 14); //If so, it updates the anonymization technique to be used;
            }
            else {
                this.updateType("PES", "#00e2ff", AUTO_ANONIMIZE);
            }
        }
    }

    static newFrom(name: string, innerHTML: string) {
        return new UserFile({
            html_contents: innerHTML,
            name: name,
            functions: getEntityTypeIs().map(k => ({ name: k.name, functionIndex: k.functionIndex })),
            ents: [],
            images: {},
            imported: new Date().toString(),
            modified: new Date().toString(),
            descriptors: undefined,
            area: undefined,
            summary: undefined,
        })
    }
}

export function isSavedUserFile(obj: any): obj is SavedUserFile {
    return "name" in obj && typeof obj.name === "string" &&
        "html_contents" in obj && typeof obj.html_contents === "string" &&
        "imported" in obj && typeof obj.imported === "string" &&
        "modified" in obj && typeof obj.modified === "string" &&
        "ents" in obj && Array.isArray(obj.ents) &&
        "images" in obj &&
        "functions" in obj && Array.isArray(obj.functions);
}

export function isUserFile(obj: any): obj is UserFile {
    return obj instanceof UserFile
}
