import { identity, increment, leter, year, reticiencias, processo, firstWord, ofuscateFirst, ofuscateFirstTwo, ofuscateLast, ofuscateLastTwo, matriculaLeter, matriculaNumber } from "../core/anonimizeFunctions"


test("Não anonimizar", () => {
    expect(identity("John Doe", "PER", 0, 0, 0)).toBe("John Doe")
})

test("Tipo incremental", () => {
    expect(increment("John Doe", "PER", 0, 1, 0)).toBe("PER0001")
    expect(increment("04/03/2023", "DAT", 0, 1, 0)).toBe("DAT0001")
})

test("Ofuscação parcial", () => {
    expect(ofuscateFirst("John Doe", "PER", 0, 0, 0)).toBe("J... ...")
    expect(ofuscateFirstTwo("John Doe", "PER", 0, 0, 0)).toBe("Jo.. ...")

    expect(ofuscateLast("John Doe", "PER", 0, 0, 0)).toBe(".... ..e")
    expect(ofuscateLastTwo("John Doe", "PER", 0, 0, 0)).toBe(".... .oe")
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
    expect(year("Jonh Doe","DAT",0,0,0)).toBe("...")
})

test("Reticiencias", () => {
    expect(reticiencias("Jonh Doe", "PER", 0,0,0)).toBe("...")
})

test("Processo", () => {
    expect(processo("2202/15.6T9FNC.L1-A.S1","PRO",0,0,0)).toBe("2202/15.6...")
    expect(processo("00001","PRO",0,0,0)).toBe("...")
})

test("Instituições", () => {
    expect(firstWord("Universidade de Lisboa","INST",0,0,0)).toBe("Universidade de ...")
    expect(firstWord("Supremo Tribunal de Justiça","INST",0,0,0)).toBe("Supremo ...")
    expect(firstWord("Tribunal da Relação de Lisboa","INST",0,0,0)).toBe("Tribunal da ...")
    expect(firstWord("Tribunal da Comarca da Grande Lisboa","INST",0,0,0)).toBe("Tribunal da ...")
})

test("Matricula", () => {
    expect(matriculaLeter("00-OO-00","MAT",0,0,0)).toBe("..-OO-..")
    expect(matriculaLeter("00OO00","MAT",0,0,0)).toBe("..OO..")
    expect(matriculaLeter("00.OO.00","MAT",0,0,0)).toBe("...OO...")
    expect(matriculaLeter("OO-00-OO","MAT",0,0,0)).toBe("OO-..-OO")

    expect(matriculaNumber("00-OO-00","MAT",0,0,0)).toBe("00-..-00")
    expect(matriculaNumber("00OO00","MAT",0,0,0)).toBe("00..00")
    expect(matriculaNumber("00.OO.00","MAT",0,0,0)).toBe("00....00")
    expect(matriculaNumber("OO-00-OO","MAT",0,0,0)).toBe("..-00-..")
})
