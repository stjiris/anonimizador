import spacy
from spacy.matcher import Matcher

# Load a Spacy language model
nlp = spacy.load("en_core_web_sm")

# Define a sample text
text = "The quick brown Fox jumps over the lazy Dog. The Cat sat on the mat."

# Define a list of words to match
words_to_match = ["fox", "cat", "dog"]

# Initialize the Matcher
matcher = Matcher(nlp.vocab)

# Define a pattern to match words from the list regardless of case
pattern = [{"LOWER": {"IN": words_to_match}}, {"TEXT": {"IN": words_to_match}}]

# Add the pattern to the matcher
matcher.add("WordsToMatch", [pattern])

# Apply the matcher to the text
doc = nlp(text)
matches = matcher(doc)

# Print the matched spans
for match_id, start, end in matches:
    matched_span = doc[start:end]
    print(matched_span.text)
