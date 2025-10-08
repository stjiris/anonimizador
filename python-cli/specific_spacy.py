import re
import csv
from spacy.language import Language
from spacy.matcher import Matcher, PhraseMatcher
from flashtext import KeywordProcessor
import string

import logging

PATTERN_MATRICULA = "[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}"
PATTERN_PROCESSO = r"\d+(-|\.|_|\s|\/)\d{1,2}(\.)[A-Z0-9]+(-|\.)[A-Z0-9]+(\.)*[A-Z0-9]*"
PATTERN_DATA = r"\b\d{1,2}(-|\.|/)\d{1,2}(-|\.|/)\d{2,4}\b"

# Termos gerais do mundo do direito que não devem ser anonimizados
EXCLUDE = ['Tribunal','Juízo','Secção','Vara','Arguído','Arguída','Arguídos','Arguídas',
            'Réu','Reu','Ré','Rés','Autores','Supremo Tribunal de Justiça','STJ','Supremo Tribunal',
            'Requerida','Autora','Instância','Relação','Supremo','Recorrente','Recorrida','Recorrido',
            'Tribunal da Relação','artº','Exª','Exº','Secção do Supremo Tribunal de Justiça','A.A.','nºs']

# Termos referentes a cargos desempenhados por agentes do poder judicial que não devem
# ser anonimizados.
MAGIS_JUIZES_PROC_LIST = ['Juiz', 'Juíza', 'Procurador', 'Procuradora', 'Magistrado', 'Magistrada', 
                          'Desembargador', 'Desembargadora', 'Relator', 'Relatora', 'Conselheiro', 'Conselheira']

EXCLUDE = EXCLUDE + MAGIS_JUIZES_PROC_LIST
EXCLUDE = [x.lower() for x in EXCLUDE]

# Termos referentes aos diferentes designativos usandos para moradas
MORADAS_TYPES = ["Rua", "Avenida", "Praça", "Largo", "Travessa", "Praceta", "Estrada", "Calçada", "Alameda", "Rotunda", "Urbanização", "Beco", "Viela", "Condomínio", "Quinta"]

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

def exclude_manual(ents):
    new_list = []
    for e in ents:
        label,start,end,text = e.label_,e.start_char,e.end_char,e.text
        if text.lower().strip() in EXCLUDE:
            continue
        elif len(text) <= 1: # Changed from 2 to 1 to accommodate acronyms for political parties;
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
        #Check if the current token is a newline character
        if token.text == "\n" or token.text =="\n\n" or token.text.endswith("."):
            #If it is, treat the next token as the start of a new sentence
            doc[i+1].is_sent_start = True
    return doc

@Language.component("remove_entities_with_excluded_words")
def remove_entities_with_excluded_words(doc):
    # List of words that should trigger exclusion
    excluded_words = ["Recorrida"]
    excluded_words = [x.lower() for x in excluded_words]
    
    # A list to hold entities that are not excluded
    entities = []
    
    for ent in doc.ents:
        # Check if the entity text contains any of the excluded words
        word_exclusion_condition = any(word in ent.text.lower() for word in excluded_words)
        
        # Check if the entity contains the symbol "º" and is not labeled as "LOC"
        symbol_exclusion_condition = "º" in ent.text.lower() and ent.label_ != "LOC"
        
        if not (word_exclusion_condition or symbol_exclusion_condition):
            # If the entity does not meet either exclusion condition, append it to the list
            entities.append(ent)
    
    # Assign the non-excluded entities back to the document
    doc.ents = entities

    return doc

# Labels specified instances of type "LOC" as addresses
def label_X_entities_and_addresses(ents):

    for ent in ents:

        # For locations (entities of type "LOC")
        if ent.label_ == "LOC":
                text_lower = ent.text.lower()

                if any(word.lower() in text_lower for word in MORADAS_TYPES):
                    ent.label_ = "MOR"
                else:
                    ent.label_ = "X-LOC"

        if ent.label_ == "ORG":
            ent.label_ = "X-ORG"

        if ent.label_ == "PROF":
            ent.label_ = "X-PROF"

        if ent.label_ == "INST":
            ent.label_ = "X-INST"

        if ent.label_ == "PRO":
            ent.label_ = "X-PRO"    
    
    return ents

def label_parties(ents, text, doc):
    with open("partidos.txt", "r") as f:
        polParties = [line.strip() for line in f]
    
    polParties_lower = set(p.lower() for p in polParties)

    # Loops through existing entities of type "ORG" and relabels them if they match a political party
    for ent in ents:

        text_lower = ent.text.lower()

        if ent.label_ == "ORG":
            if text_lower in polParties_lower:
                ent.label_ = "PART"  # Relabel
            
    matcher = Matcher(doc.vocab)
    patterns = []

    for party in polParties:
        patterns.append([{"ORTH": party}])
    
    matcher.add("PARTIES", patterns)

    # Runs matcher on document and saves it on matches
    matches = matcher(doc)

    for match_id, start, end in matches:
        span = doc[start:end]
        if len(span.text) <= 5:        
            ents.append(FakeEntity("PART", start, end, span.text))
        
    return ents

def label_social_media(doc, ents):

    with open("redes_sociais.txt", "r") as f:
        platforms = [line.strip().lower() for line in f]
    
    # Create matcher
    matcher = Matcher(doc.vocab)
    linkPatterns = []
    handlePatterns = []

    
    # Run matcher on document and saves it on matches
    matches = matcher(doc)
        
    # Find where match is on document and adds it to entity list
    for match_id, start, end in matches:
        span = doc[start:end]
        ents.append(FakeEntity("RED", start, end, span.text))
        
    # Return new entities
    return ents

def label_professions(doc, ents):
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
    matcher.add("PROFESSIONS", [pattern])
    
    #Run matcher on document and saves it on matches
    matches = matcher(doc)
    
    #Copy entities from doc to the new entity list
    for ent in ents:
        entities.append(ent)
        
    #Finds where match is on document and adds it to entity list
    for match_id, start, end in matches:
        span = doc[start:end]
        entities.append(FakeEntity("PROF", start, end, span.text))
        
    #Return new entities
    return entities

def process_entities(ents, text):
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
            
    return ents

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

def add_missed_entities(ents, text):
    # Collect the text and label of entities recognized by the model
    recognized_entities = {ent.text: ent.label_ for ent in ents}

    keyword_processor = KeywordProcessor(case_sensitive=True)
    # Add recognized entities to keyword_processor
    for keyword, label in recognized_entities.items():
        keyword_processor.add_keyword(keyword, (label, keyword))

    # Run keyword_processor and save matches
    matches = keyword_processor.extract_keywords(text, span_info=True)

    # Sort the matches by length in descending order
    matches = sorted(matches, key=lambda x: x[2] - x[1], reverse=True)

    # To keep track of spans already added
    added_spans = []

    new_ents = []
    # Loop matches to add with original label to new_ents list
    for match in matches:
        label_keyword, start, end = match
        label, keyword = label_keyword
        # Check if this span overlaps with any of the spans already added
        if not any(old_start <= start <= old_end or old_start <= end <= old_end for old_start, old_end in added_spans):
            # If not, add it to new_ents
            new_ents.append(FakeEntity(label, start, end, keyword))
            added_spans.append((start, end))

    return new_ents

def merge(ents, text):
    # Store merged list
    merged = []
    # Variable that stores the last entity processed
    last_ent = None
    for ent in ents:
        # Quick fix for IBANs being identified as ORG
        if ent.text.startswith("IBAN"):
            ent.label_ = "IDP"
        # If it's the first entity in the list, simply copy it to last_ent
        if not last_ent:
            last_ent = FakeEntity(ent.label_, ent.start_char, ent.end_char, ent.text)
            continue

        # If the current entity's label is different from the last entity's label, append to merged list 
        if str(last_ent.label_) != str(ent.label_):
            merged.append(last_ent)
            last_ent = FakeEntity(ent.label_, ent.start_char, ent.end_char, ent.text)
            continue

        # Merge LOCs if there are no alnum or \n between them
        if str(last_ent.label_) == "LOC" and all(not s.isalnum() and not s == "\n" for s in text[last_ent.end_char:ent.start_char]):
            last_ent.end_char = max(ent.end_char, last_ent.end_char)
            last_ent.text = text[last_ent.start_char:last_ent.end_char]
        # Merge ORGs if they are separated by "-" or whitespace
        elif str(last_ent.label_) == "ORG" and all(s.isspace() or s == "-" and not s == "\n" for s in text[last_ent.end_char:ent.start_char]):
            last_ent.end_char = max(ent.end_char, last_ent.end_char)
            last_ent.text = text[last_ent.start_char:last_ent.end_char]
        # Merge other labels if separated only by whitespace
        elif all(s.isspace() and not s == "\n" for s in text[last_ent.end_char:ent.start_char]):
            last_ent.end_char = max(ent.end_char, last_ent.end_char)
            last_ent.text = text[last_ent.start_char:last_ent.end_char]
        # Otherwise, add entity to merged list
        else:
            merged.append(last_ent)
            last_ent = FakeEntity(ent.label_, ent.start_char, ent.end_char, ent.text)

    # Append final entity
    if last_ent:
        merged.append(last_ent)
    return merged

def nlp(text, model):
    model.add_pipe("new_line_segmenter", before="ner")
    model.add_pipe("remove_entities_with_excluded_words", last=True)

    # Create entity list
    ents = []
    
    try:
        
        if len(text) > 999999:
            raise RuntimeError
        
        #Runs the model
        doc = model(text)
        
        for ent in exclude_manual(doc.ents):
            ents.append(FakeEntity(ent.label_,ent.start_char,ent.end_char,ent.text))
    
    except RuntimeError:
        
        #Create tokenizer
        tokenizer = model.tokenizer
        
        #Split text into chunks if they exceed the token limit and keep their offsets
        #text_chunks is a tuple: (chunks,positions)
        text_chunks = split_into_chunks(text, tokenizer)
        
        #Run the model for each chunk
        for chunk, position in zip(text_chunks[0],text_chunks[1]):
            
            #Run the model for current chunk
            doc=model(chunk)
            
            for ent in exclude_manual(doc.ents):
                ent.start_char += position
                ent.end_char += position
                ents.append(FakeEntity(ent.label_,ent.start_char,ent.end_char,ent.text))
        
    ents = label_professions(doc, ents)
    ents = process_entities(ents, text)
    ents = add_missed_entities(ents, text)
    ents = label_parties(ents, text, doc)
    ents = label_X_entities_and_addresses(ents)
    ents = label_social_media(doc, ents)
    ents = sorted(ents,key=lambda x: x.start_char)
    ents = merge(ents, text)
    return FakeDoc(ents, doc.text)