import spacy
import re
import sys
import csv
spacy_model = "./model-best"
from spacy.language import Language
from spacy.matcher import PhraseMatcher
from spacy.matcher import Matcher
from spacy.tokens import Span

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

def exclude_manual(ents):
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

#Includes names after some key words and removes their prefixes
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
    n=0
    for ent in doc.ents:
        if not any(word in ent.text.lower() for word in excluded_words):
            entities.append(ent)
        else:
            n+=1
    if n>=1:
        print("Excluded Entities:",n)
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

@Language.component("label_professions")
def label_professions(doc):
    
    #Create matcher
    matcher = Matcher(doc.vocab)
    
    #Create entity list
    entities = []
    
    #Open professions file to create a list with professions
    with open("../profissoes.txt", "r") as f:
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
    
def split_into_chunks(text, tokenizer, max_length=512):
    chunks = []
    tokens = tokenizer(text)
    current_chunk = []
    current_length = 0
    positions=[0]
    position=0
    final_position=0

    for token in tokens:
        if current_length + len(token.text) <= max_length:
            current_chunk.append(token.text)
            current_length += len(token.text)
            position = current_length
        else:
            chunk_text = text[positions[-1]:positions[-1] + position]

            chunks.append(chunk_text)
            
            final_position+=position
            positions.append(final_position)
            current_chunk = [token.text]
            current_length = len(token.text)
            position = current_length

    if current_chunk:
        chunk_text = text[positions[-1]:positions[-1] + position]

        chunks.append(chunk_text)
        
        
        final_position+=position
        positions.append(final_position)

    return chunks, positions
    
def process_entities(ents):
    #Include entities by their pattern
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
    
    return ents

def add_missed_entities(nlp, doc, ents):
    # collect the text and label of entities recognized by the model
    recognized_entities = {ent.text.lower(): ent.label_ for ent in ents}

    # create a PhraseMatcher with attr LOWER to be case insensitive
    matcher = PhraseMatcher(nlp.vocab, attr='LOWER')
    # create list of text to look for
    patterns = [nlp.make_doc(text) for text in recognized_entities.keys()]
    # add list to matcher
    matcher.add("MISSED_ENTITY", patterns)
    # run matcher and save matches
    matches = matcher(doc)
    # copy ents
    new_ents = ents
    # loop matches to add with original label to new_ents list
    for match_id, start, end in matches:
        if nlp.vocab.strings[match_id] == "MISSED_ENTITY":
            # assign the same label as the recognized entity
            new_ent = Span(doc, start, end, label=recognized_entities[doc[start:end].text.lower()])
            new_ents.append(new_ent)

    return new_ents


# def check_missed_entities(text, ents):

    

#     for ent in ents:
#         start = text.find(ent.text)
#         if start != ent.start_char:
#             ents.append(FakeEntity(ent.label, start, start+len(ent.text),))
            
#     return ents
        
    
def nlp(text):
    snlp = spacy.load(spacy_model)
    snlp.add_pipe("new_line_segmenter", before="ner")
    #snlp.add_pipe("label_professions", after="ner")
    snlp.add_pipe("remove_entities_with_excluded_words", last=True)
    print(snlp.pipe_names)
    
    #Create entity list
    ents = []

    #Run the model 
    #doc = snlp("\n".join(text.split("."))) #solves \n problems but creates "." problems
    
    try:
        doc = snlp(text) #runs the model on the full text (for num_tokens<512)
        print("Good token size. Text will be processed normally.")
        
        for ent in exclude_manual(doc.ents):
            ents.append(FakeEntity(ent.label_,ent.start_char,ent.end_char,ent.text))
            
    except RuntimeError:
        print("Tokens exceeded 512 limit. Text will be processed in chunks.")
        
        #Create tokenizer
        tokenizer = snlp.tokenizer
        
        #Split text into chunks if they exceed the token limit and keep their offsets
        #text_chunks is a tuple: (chunks,positions)
        text_chunks = split_into_chunks(text, tokenizer)
        
        #Run the model for each chunk
        for chunk, position in zip(text_chunks[0],text_chunks[1]):
            
            #Run the model for current chunk
            doc=snlp(chunk)
            
            for ent in exclude_manual(doc.ents):
                ent.start_char += position
                ent.end_char += position
                ents.append(FakeEntity(ent.label_,ent.start_char,ent.end_char,ent.text))
        
    ents = process_entities(ents)
    ents = sorted(ents,key=lambda x: x.start_char)
    ents = add_missed_entities(snlp, doc, ents)
    return FakeDoc(ents, doc.text)

if __name__ == "__main__":
    f=open("teste.txt","r")
    text = f.read()
    doc = nlp(text)
    for ent in doc.ents:
        print(ent.text, ent.label_, ent.start_char, ent.end_char)
    