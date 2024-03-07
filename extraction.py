import fitz
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer
import string

def extract_and_preprocess(filepath):
    # Open the PDF document
    doc = fitz.open(filepath)
    text = ""
    # Extract text from each page
    for page in doc:
        text += page.get_text()
    # Tokenize the text
    tokens = word_tokenize(text)
    # Remove punctuation and convert to lowercase
    tokens = [word.lower() for word in tokens if word.isalnum()]
    # Remove stop words
    stop_words = set(stopwords.words('english'))
    tokens = [word for word in tokens if not word in stop_words]
    # Stemming
    porter = PorterStemmer()
    tokens = [porter.stem(word) for word in tokens]
    # Join the tokens back into text
    preprocessed_text = ' '.join(tokens)
    return preprocessed_text

# Example usage
# filepath = "static/testbook.pdf"
# preprocessed_text = extract_and_preprocess(filepath)
# print(preprocessed_text)
