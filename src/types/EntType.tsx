export const EntTypeColors: any = {
    "default": "#eb8634",
    "PES": "#84d2ff",
    "ORG": "#00ffa2",
    "DAT": "#66fc03",
    "LOC": "#fc03c2",
    "PRO": "#eb8634",
    "MAT": "#eb3434",
    "CEP": "#f58142",
    "TEL": "#ce42f5",
    "EMA": "#f5d142"
}

export interface EntType {
    name: string
    color: string
}

export interface OffsetRange{
    start: number
    end: number
}

export interface AnonimizableEnt{
    offsets: OffsetRange[]
    type: EntType
    cod: string
    text: string
}