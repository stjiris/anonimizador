import torch

# Patch for models saved without embeddings.position_ids (older transformers)
_original_torch_load = torch.load
def _patched_torch_load(f, **kwargs):
    state = _original_torch_load(f, **kwargs)
    if isinstance(state, dict) and 'embeddings.position_ids' not in state:
        state['embeddings.position_ids'] = torch.arange(512).expand((1, -1))
    return state
torch.load = _patched_torch_load

from specific_spacy import nlp, FakeDoc
import spacy
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

print("Loading model...", flush=True)
model = spacy.load("./src/scripts/model-extended")
print("Model loaded.", flush=True)

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
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
