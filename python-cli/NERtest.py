import spacy
import re
import sys
import csv
spacy_model = "./model-best"
from spacy.language import Language
from spacy.matcher import PhraseMatcher

PATTERN_MATRICULA = "[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}"
PATTERN_PROCESSO = r"\d+(-|\.|_|\s|\/)\d{1,2}(\.)[A-Z0-9]+(-|\.)[A-Z0-9]+(\.)*[A-Z0-9]*"
PATTERN_DATA = r"\d{1,2}(-|\.|/)\d{1,2}(-|\.|/)\d{4}"
EXCLUDE = ['Tribunal','Réu','Reu','Ré','Supremo Tribunal de Justiça',"STJ","Supremo Tribunal",
            'Requerida','Autora','Instância','Relação','Supremo','Recorrente','Recorrida'
            'Tribunal da Relação','artº','Exª','Exº','nº']
EXCLUDE = [x.lower() for x in EXCLUDE]

class FakeEntity:
    def __init__(self,label,start,end,text: str):
        soff = len(text) - len(text.lstrip())

        self.label_ = label
        self.start_char = start+soff
        self.text = text.strip()
        self.end_char = self.start_char+len(self.text)

class FakeDoc:
    def __init__(self,ents, text):
        self.ents = ents
        self.text = text

def excude_manual(ents):
    new_list = []
    for e in ents:
        label,start,end,text = e.label_,e.start_char,e.end_char,e.text
        if text.lower().strip() in EXCLUDE:
            continue
        elif len(text) <= 2:
            continue
        elif re.match(r"^\d+(º|ª)$",text):
            continue
        elif label == 'DAT' and re.match(PATTERN_DATA,text):
            text = re.match(PATTERN_DATA,text).group()
            end = start+len(text)
            new_list.append(FakeEntity(label,start,end,text))
        else:
            new_list.append(FakeEntity(label,start,end,text))
    return new_list

def correct_ent(ents):
    new_list = []
    for e in ents:
        label,start,end,text = e.label_,e.start_char,e.end_char,e.text
        if text.startswith("Ré ") and len(text) > 3+2:
            new_list.append(FakeEntity(label,start+3,end,text[3:]))
        elif text.startswith("Réu ") and len(text) > 4+2:
            new_list.append(FakeEntity(label,start+4,end,text[4:]))
        elif text.startswith("Autora ") and len(text) > 7+2:
            new_list.append(FakeEntity(label,start+7,end,text[7:]))
        else:
            new_list.append(FakeEntity(label,start,end,text))
    return new_list

def add_ent_by_pattern(ents, text, pattern, label):
    p = re.compile(pattern)
    for m in p.finditer(text):
        go = True
        start_pos,end_pos = m.span()
        for e in ents: 
            if start_pos >= e.start_char and start_pos <= e.end_char or end_pos >= e.start_char and end_pos <= e.end_char:
                go = False
                break
        if go:
            ents.append(FakeEntity(label, start_pos, end_pos, text[start_pos:end_pos]))
    return ents

def remove_pattern(p, ents):
    new_list = []
    for e in ents:
        if not p.match(e.text):
            new_list.append(e)
    return new_list



@Language.component("remove_entities_with_excluded_words")
def remove_entities_with_excluded_words(doc):
    excluded_words = ["john richard", "frigocar"]
    entities = []
    for ent in doc.ents:
        if not any(word in ent.text.lower() for word in excluded_words):
            entities.append(ent)
        else:
            print("OLAaaaaaaa")
    doc.ents = entities
    return doc

@Language.component("new_line_segmenter")
def new_line_segmenter(doc):
    for i, token in enumerate(doc[:-1]):
        #print(token.text)
        # Check if the current token is a newline character
        if token.text == "\n" or token.text=="\n\n" or token.text.endswith("."):
            # If it is, treat the next token as the start of a new sentence
            doc[i+1].is_sent_start = True
        
    return doc

def nlp(text):
    snlp = spacy.load(spacy_model)
    snlp.add_pipe("new_line_segmenter", before="ner")
    #snlp.add_pipe("label_professions", after="ner")
    #snlp.add_pipe("remove_entities_with_excluded_words", last=True)
    print(snlp.pipe_names)
    
    #Create matcher
    matcher = PhraseMatcher(snlp.vocab, attr="LOWER")
    #Open professions file to create a list with professions
    with open("profissoes.txt", "r") as f:
        professions = []
        for line in f:
            professions.append(line.strip())
    
    #Make each profession a pattern        
    patterns=[snlp.make_doc(text) for text in professions]
    #Add patterns to the matcher
    matcher.add("PROFESSIONS",patterns)
    
    #Creates entity list
    ents = []
    #Runs the model 
    doc = snlp("\n".join(text.split(".")))
    
    #Run matcher on document and saves it on matches
    matches = matcher(doc)
    #Finds where match is on document and adds it to entity list
    for match_id, start, end in matches:
        span = doc[start:end]
        ents.append(FakeEntity("PROF", start, end, span.text))
    
    for ent in excude_manual(doc.ents):
        ents.append(ent)
 
    with open('../patterns.csv', 'r') as csvfd:
        reader = csv.DictReader(csvfd, delimiter="\t")
        for r in reader:
            add_ent_by_pattern(ents, text, r['Pattern'], r['Label'])
    
    ents = correct_ent(ents)
    with open('../exclude.csv', 'r') as csvfd:
        reader = csv.DictReader(csvfd, delimiter="\t")
        for r in reader:
            p = re.compile(r['Pattern'])
            ents = remove_pattern(p, ents)
    ents = sorted(ents,key=lambda x: x.start_char)
    return FakeDoc(ents, doc.text)

# def nlp_pipe(texts):
#     snlp = spacy.load(spacy_model)
#     for doc in snlp.pipe(texts):
#         ents = []
#         for ent in excude_manual(doc.ents):
#             ents.append(ent)

#         with open('patterns.csv', 'r') as csvfd:
#             reader = csv.DictReader(csvfd, delimiter="\t")
#             for r in reader:
#                 add_ent_by_pattern(ents, text, r['Pattern'], r['Label'])
        
#         ents = correct_ent(ents)
#         with open('exclude.csv', 'r') as csvfd:
#             reader = csv.DictReader(csvfd, delimiter="\t")
#             for r in reader:
#                 p = re.compile(r['Pattern'])
#                 ents = remove_pattern(p, ents)
#         ents = sorted(ents,key=lambda x: x.start_char)
#         yield FakeDoc(ents, doc.text)

if __name__ == "__main__":
    f=open("teste.txt","r")
    text = f.read()
    doc = nlp(text)
    #print(text)
    for ent in doc.ents:
        print(ent.text, ent.label_)
    