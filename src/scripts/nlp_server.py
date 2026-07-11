from specific_spacy import nlp, FakeDoc
import os
import spacy
import json
import torch
from http.server import HTTPServer, BaseHTTPRequestHandler

# Number of CPU threads the transformer uses. This is the main lever for how
# fast a big decision is processed (NER inference is CPU-bound). NLP_THREADS=0
# (or unset) lets PyTorch use all available cores; set a number to pin it lower
# if the nlp_server has to share the box with other services.
_nlp_threads = int(os.environ.get("NLP_THREADS", "0"))
if _nlp_threads > 0:
    torch.set_num_threads(_nlp_threads)
print(f"Torch threads: {torch.get_num_threads()}", flush=True)

model = None
try:
    print("Loading model...", flush=True)
    model = spacy.load("./src/scripts/model-extended")
    print("Model loaded.", flush=True)
except Exception as e:
    print(f"Failed to load model, server will start but NLP requests will return 503: {e}", flush=True)

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if model is None:
            self.send_response(503)
            self.end_headers()
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            text = self.rfile.read(length).decode("utf-8")
            doc = nlp(text, model)
            entities = [
                {"text": e.text, "label_": e.label_, "start_char": e.start_char, "end_char": e.end_char}
                for e in doc.ents
            ]
            body = json.dumps(entities).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            print(f"Error in handler: {e}", flush=True)
            import traceback
            traceback.print_exc()
            self.send_response(500)
            self.end_headers()

    def log_message(self, format, *args):
        print(format % args, flush=True)

HTTPServer(("0.0.0.0", 5001), Handler).serve_forever()
