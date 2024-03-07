from haystack.document_stores import InMemoryDocumentStore

def store_document(preprocessed_text, embedded_text):
    # Initialize an in-memory document store
    document_store = InMemoryDocumentStore()

    # Add document and its embedding to the store
    document_store.write_documents([{'content': preprocessed_text, 'text': preprocessed_text, 'embedding': embedded_text[0]}])

    # Note: You can add multiple documents in a loop or as needed
    return document_store