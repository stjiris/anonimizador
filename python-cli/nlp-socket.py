import spacy
import sys
import json
import datetime


def printMessage(message_type, message):
    sys.stdout.write(
        json.dumps(
            {
                "type": message_type,
                "message": message,
                "date": datetime.datetime.now().isoformat(),
            },
            ensure_ascii=False,
        )
    )
    sys.stdout.write("\n")
    sys.stdout.flush()


if __name__ == "__main__":
    printMessage("Info", "A carregar modelo")
    nlp = spacy.load("model-ep/")
    while True:
        printMessage("Protocol", "Await input")
        line = sys.stdin.readline()
        if not line:
            break
        obj = json.loads(line)
        offset = obj["offset"]
        text = obj["text"]
        if len(text.strip()) > 0:
            currEnt = None
            doc = nlp(text)
            for ent in doc.ents:
                # Map model labels to system labels
                label = ent.label_
                if label == "PER":
                    label = "PES"
                elif label == "ADDR":
                    label = "MOR"

                if currEnt == None:
                    currEnt = {
                        "start": ent.start_char + offset,
                        "end": ent.end_char + offset,
                        "text": ent.text,
                        "label": label,
                    }
                elif (
                    currEnt["end"] == ent.start_char + offset
                    and currEnt["label"] == label
                ):
                    currEnt["end"] = ent.end_char + offset
                else:
                    printMessage("Entity", currEnt)
                    currEnt = {
                        "start": ent.start_char + offset,
                        "end": ent.end_char + offset,
                        "text": ent.text,
                        "label": label,
                    }
        if not currEnt is None:
            printMessage("Entity", currEnt)
            currEnt = None
