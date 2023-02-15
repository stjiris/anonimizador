from specific_spacy import nlp, FakeDoc
import spacy
import sys
import json
import csv
import datetime
import click

@click.command()
@click.option('-i', '--input-file', help='text to find entities',type=click.File('r'),default=sys.stdin, show_default="STDIN")
@click.option('-o', '--output-file', help='text to find entities',type=click.File('w'),default=sys.stdout, show_default="STDOUT")
@click.option('-f', '--format', help="format output", type=click.Choice(['json','csv']), default='csv', show_default=True)
@click.option('-m','--model', help="model to use", type=click.Choice(['model-best', 'spacy-pt', 'none']), default='model-best', show_default=True)
def process(input_file, output_file, format, model):
    with input_file:
        contents = input_file.read()
    if model == 'model-best':
        model = spacy.load("./python-cli/model-best")
    if model == 'spacy-pt':
        model = spacy.load("pt_core_news_lg")
    if model == 'none':
        model = lambda txt: FakeDoc([], txt)

    doc = nlp(contents, model)
    
    with output_file:
        entities = list({'text':e.text, 'label_': e.label_, 'start_char': e.start_char, 'end_char': e.end_char} for e in doc.ents)
        if format == 'json':
            json.dump(entities, output_file)
        if format == 'csv':
            writer = csv.DictWriter(output_file, ['text', 'label_','start_char','end_char'])

            writer.writeheader()
            writer.writerows(entities)





if __name__ == '__main__':
    process()
    """printMessage("Info", "A carregar modelo")
    while True:
        printMessage("Protocol", "Await input")
        line = sys.stdin.readline()
        if not line:
            break
        obj = json.loads(line)
        offset = obj['offset']
        text = obj['text']
        if len(text.strip()) > 0:
            currEnt = None
            doc = nlp(text)
            for ent in doc.ents:
                if currEnt == None:
                    currEnt = {
                        'start': ent.start_char + offset,
                        'end': ent.end_char + offset,
                        'text': ent.text,
                        'label': ent.label_
                    }
                elif currEnt['end'] == ent.start_char+offset and currEnt['label'] == ent.label_:
                    currEnt['end'] = ent.end_char + offset
                else:
                    printMessage("Entity", currEnt)
                    currEnt = {
                        'start': ent.start_char + offset,
                        'end': ent.end_char + offset,
                        'text': ent.text,
                        'label': ent.label_
                    }
        if not currEnt is None:
            printMessage("Entity", currEnt)
            currEnt = None"""


