# Import functions from separate scripts
from extraction import extract_and_preprocess
from embeddings import embed_text
from indexing import store_document
from qa import answer_question

def main(pdf_filepath, question):
    # Step 1: Extract text from PDF
    #extracted_text = extract_text_from_pdf(pdf_filepath)

    # Step 2: Preprocess the text
    preprocessed_text = extract_and_preprocess(pdf_filepath)

    # Step 3: Embed the preprocessed text
    embedding = embed_text(preprocessed_text)

    # Step 4: Store the document and its embedding
    retrieved_documents = store_document(preprocessed_text, embedding)

    # Step 5: Retrieve relevant documents
    #retrieved_documents = retrieve_documents(question)

    # Step 6: Answer the question using retrieved documents
    answer = answer_question(question, retrieved_documents)

    # Print the answer
    #print("Answer:", answer)

if __name__ == "__main__":
    # Provide the filepath of the PDF and the question
    pdf_filepath = "static/testbook.pdf"
    question = "what is law?"

    # Call the main function with the PDF filepath and question
    main(pdf_filepath, question)
