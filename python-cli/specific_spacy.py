import spacy
import re
import sys
import csv
from spacy.language import Language
from spacy.matcher import Matcher

PATTERN_MATRICULA = "[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}"
PATTERN_PROCESSO = r"\d+(-|\.|_|\s|\/)\d{1,2}(\.)[A-Z0-9]+(-|\.)[A-Z0-9]+(\.)*[A-Z0-9]*"
PATTERN_DATA = r"\d{1,2}(-|\.|/)\d{1,2}(-|\.|/)\d{4}"
EXCLUDE = ['Tribunal','Réu','Reu','Ré','Supremo Tribunal de Justiça',"STJ","Supremo Tribunal",
            'Requerida','Autora','Instância','Relação','Supremo','Recorrente','Recorrida'
            'Tribunal da Relação','artº','Exª','Exº','Secção do Supremo Tribunal de Justiça']
EXCLUDE = [x.lower() for x in EXCLUDE]

class FakeEntity:
    def __init__(self,label,start,end,text: str):
        soff = len(text) - len(text.lstrip())

        self.label_ = label if label != "PER" else "PES"
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

def get_both_genders(words):
    new_words=[]
    for word in words:
        if word.endswith("o"):
            new_word = word[:-1] + "a"
            new_words.append(word)
            new_words.append(new_word)
        elif word.endswith("a"):
            new_word = word[:-1] + "o"
            new_words.append(word)
            new_words.append(new_word)
        elif word.endswith("r"):
            new_word = word + "a"
            new_words.append(word)
            new_words.append(new_word)
        else:
            new_words.append(word)
        
    return new_words

@Language.component("new_line_segmenter")
def new_line_segmenter(doc):
    for i, token in enumerate(doc[:-1]):
        # Check if the current token is a newline character
        if token.text == "\n" or token.text =="\n\n" or token.text.endswith("."):
            # If it is, treat the next token as the start of a new sentence
            doc[i+1].is_sent_start = True
    return doc

@Language.component("label_professions")
def label_professions(doc):
    
    #Create matcher
    matcher = Matcher(doc.vocab)
    
    #Create entity list
    entities = []
    
    #Open professions file to create a list with professions
    with open("profissoes.txt", "r") as f:
        professions = [line.strip().lower() for line in f]
    
    #Create new professions list with both genders
    new_professions = get_both_genders(professions)
    
    #Make each profession a pattern        
    pattern=[{"LOWER": {"IN": new_professions}}]#, {"TEXT": {"REGEX": r"\b(\w+)(a|o|as|os)?\b"}}]
    #Add patterns to the matcher
    matcher.add("PROFESSIONS",[pattern])
    
    #Run matcher on document and saves it on matches
    matches = matcher(doc)
    
    #Copy entities from doc to the new entity list
    for ent in doc.ents:
        entities.append(ent)
        
    #Finds where match is on document and adds it to entity list
    for match_id, start, end in matches:
        span = doc[start:end]
        entities.append(FakeEntity("PROF", start, end, span.text))
        
    #Sort entity list by their position in the doc
    entities = sorted(entities,key=lambda x: x.start_char)
    
    #Return doc with new entities
    return FakeDoc(entities, doc.text)

def nlp(text, model):
    model.add_pipe("new_line_segmenter", before="ner")
    model.add_pipe("label_professions", after="ner")
    
    #Runs the model
    doc = model("\n".join(text.split(".")))
    
    ents = []
    for ent in excude_manual(doc.ents):
        ents.append(FakeEntity(ent.label_,ent.start_char,ent.end_char,ent.text))

    with open('patterns.csv', 'r') as csvfd:
        reader = csv.DictReader(csvfd, delimiter="\t")
        for r in reader:
            add_ent_by_pattern(ents, text, r['Pattern'], r['Label'])
    
    ents = correct_ent(ents)
    with open('exclude.csv', 'r') as csvfd:
        reader = csv.DictReader(csvfd, delimiter="\t")
        for r in reader:
            p = re.compile(r['Pattern'])
            ents = remove_pattern(p, ents)
    ents = sorted(ents,key=lambda x: x.start_char)
    return FakeDoc(ents, doc.text)