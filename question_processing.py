from sentence_transformers import SentenceTransformer

def embed_text(text):
    # Load a pre-trained sentence transformer model
    model = SentenceTransformer('all-mpnet-base-v2')
    # Encode the text into numerical representations
    embedding = model.encode([text])
    return embedding

# Example usage
# embedded_text = embed_text("bruh moment fr fr omegalul")
# print(embedded_text)
