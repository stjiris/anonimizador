import { TypeNames } from "../types/EntityTypes"
import { identity, increment, ofuscate, leter, year, reticiencias, processo, tel, nib, firstWord, matricula } from "../util/anonimizeFunctions"

let Nome = "John Doe"
let Tel = "900000000"
let Dat = "04/03/2023"

test("Não anonimizar", () => {
    expect(identity("John Doe", "PER", 0, 0, 0)).toBe("John Doe")
})

test("Tipo incremental", () => {
    expect(increment("John Doe", "PER", 0, 1, 0)).toBe("PER0001")
    expect(increment("04/03/2023", "DAT", 0, 1, 0)).toBe("DAT0001")
})

test("Ofuscação parcial", () => {
    expect(ofuscate("John Doe", "PER", 0, 0, 0)).toBe("J... ...")
})

test("Letra incremental", () => {
    expect(leter("John Doe", "PER", 0, 0, 0)).toBe("AA")
    expect(leter("John Doe", "PER", 0, 0, 1)).toBe("BB")
    expect(leter("John Doe", "PER", 0, 0, 26)).toBe("AAA")
    expect(leter("John Doe", "PER", 0, 0, 27)).toBe("BBB")
})

test("Datas", () => {
    expect(year("04/03/2023","DAT",0,0,0)).toBe(".../.../2023")
    expect(year("04-03-2023","DAT",0,0,0)).toBe("...-...-2023")
    expect(year("04.03.2023","DAT",0,0,0)).toBe("........2023")
    expect(year("04.03.23","DAT",0,0,0)).toBe("........23")
    expect(year("23.03.04","DAT",0,0,0)).toBe("........04") // Should have ano invertido?
    expect(year("4 de Março de 2023","DAT",0,0,0)).toBe("... de ... de 2023")
})

test("Reticiencias", () => {
    expect(reticiencias("Jonh Doe", "PER", 0,0,0)).toBe("...")
})

test("Processo", () => {
    expect(processo("2202/15.6T9FNC.L1-A.S1","PRO",0,0,0)).toBe("2202/15.6...")
    expect(processo("00001","PRO",0,0,0)).toBe("0....")
})

test("Telefone", () => {
    expect(tel("910000009","TEL",0,0,0)).toBe("...9")
})

test("Nib", () => {
    expect(nib("PT50000000000000000000099","NIB" as TypeNames,0,0,0)).toBe("...99")
})

test("Instituições", () => {
    expect(firstWord("Universidade de Lisboa","INST",0,0,0)).toBe("Universidade de ...")
    expect(firstWord("Supremo Tribunal de Justiça","INST",0,0,0)).toBe("Supremo ...")
    expect(firstWord("Tribunal da Relação de Lisboa","INST",0,0,0)).toBe("Tribunal ...")
    expect(firstWord("Tribunal da Comarca da Grande Lisboa","INST",0,0,0)).toBe("Tribunal ...")
})

test("Matricula", () => {
    expect(matricula("00-OO-00","MAT",0,0,0)).toBe("..-OO-..")
    expect(matricula("00OO00","MAT",0,0,0)).toBe("..OO..")
    expect(matricula("00.OO.00","MAT",0,0,0)).toBe("...OO...")
    expect(matricula("OO-00-OO","MAT",0,0,0)).toBe("OO-..-OO")
})
