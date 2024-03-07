from haystack.nodes import DensePassageRetriever, FARMReader, JoinAnswers

def answer_question(question, document_store, model_name="deepset/roberta-base-squad2"):
    # Initialize retriever and reader
    retriever = DensePassageRetriever(document_store=document_store)
    reader = FARMReader(model_name_or_path=model_name)  # Allow specifying a model name

    # Retrieve relevant documents and find answers
    retrieved_documents = retriever.retrieve(query=question)
    answers = reader.predict(query=question, documents=retrieved_documents, top_k=3)

    # Handle answer extraction robustly
    print(answers)
    try:
        answer_text = answers['answers'][0]['answer']
        answer_score = answers['answers'][0]['score']
        context = answers['answers'][0]['context'] if 'context' in answers['answers'][0] else None
    except (KeyError, TypeError):
        print("Sorry, I couldn't find an answer to your question in this document.")
        return  # Exit function early if no answer found

    # Present answer with context, confidence, and user tips
    print(f"Answer (Confidence Score: {answer_score:.2f}):")
    if context:
        print(f"\tContext: {context}")
    print(f"\t{answer_text}")