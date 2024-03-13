from __future__ import annotations
import backoff
from tenacity import retry, stop_after_attempt, wait_random_exponential
from google.api_core.exceptions import ResourceExhausted
from google.api_core.client_options import ClientOptions
from google.api_core.exceptions import AlreadyExists
from google.cloud import documentai
import numpy as np
import glob
import os
from typing import Dict, List
import pandas as pd
from logging import error
import re
import textwrap
from typing import Tuple, List
import vertexai
from vertexai.language_models import TextEmbeddingModel, TextGenerationModel

# run this in terminal. will prompt you to login via a google account for authentication.
# set GOOGLE_APPLICATION_CREDENTIALS=/Users/moses/google-cloud-sdk/summarizepro-f498a9ddcd4e.json
# gcloud config set project "summarizepro"
# gcloud auth activate-service-account summarizepro-685@summarizepro.iam.gserviceaccount.com --key-file /Users/moses/google-cloud-sdk/summarizepro-f498a9ddcd4e.json
# gcloud projects add-iam-policy-binding summarizepro --member serviceAccount:summarizepro-685@summarizepro.iam.gserviceaccount.com --role roles/reader
# gcloud projects add-iam-policy-binding summarizepro --member user:saadshahidqavi2003@gmail.com --role roles/reader
# gcloud services enable documentai.googleapis.com storage.googleapis.com aiplatform.googleapis.com
# gsutil -m cp -r gs://github-repo/documents/docai

# gcloud projects add-iam-policy-binding summarizepro \
# --member serviceAccount:summarizepro-685@summarizepro.iam.gserviceaccount.com \
# --role roles/documentai.apiUser

# TODO(developer): Edit these variables before running the code.
project_id = "summarizepro"

# See https://cloud.google.com/document-ai/docs/regions for all options.
location = "us"

# Must be unique per project, e.g.: "My Processor"
processor_display_name = "TestProcessor2"

# You must set the `api_endpoint` if you use a location other than "us".
client_options = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")


# def create_processor(
#     project_id: str, location: str, processor_display_name: str
# ) -> documentai.Processor:
#     client = documentai.DocumentProcessorServiceClient(client_options=client_options)

#     # The full resource name of the location
#     # e.g.: projects/project_id/locations/location
#     parent = client.common_location_path(project_id, location)

#     # Create a processor
#     return client.create_processor(
#         parent=parent,
#         processor=documentai.Processor(
#             display_name=processor_display_name, type_="OCR_PROCESSOR"
#         ),
#     )

# runs function to create docai processor
# try:
#     processor = create_processor(project_id, location, processor_display_name)
#     print(f"Created Processor {processor.name}")
# except AlreadyExists as e:
#     print(
#         f"Processor already exits, change the processor name and rerun this code. {e.message}"
#     )

def process_document(processor_name: str,file_path: str) -> documentai.Document:
    client = documentai.DocumentProcessorServiceClient(client_options=client_options)

    # Read the file into memory
    with open(file_path, "rb") as image:
        image_content = image.read()

    # Load Binary Data into Document AI RawDocument Object
    raw_document = documentai.RawDocument(
        content=image_content, mime_type="application/pdf"
    )

    # Configure the process request
    request = documentai.ProcessRequest(name=processor_name, raw_document=raw_document)

    result = client.process_document(request=request)

    return result.document


def layout_to_text(layout: documentai.Document.Page.Layout, text: str) -> str:
    """
    Document AI identifies text in different parts of the document by their
    offsets in the entirety of the document"s text. This function converts
    offsets to a string.
    """
    # If a text segment spans several lines, it will
    # be stored in different text segments.
    return "".join(
        text[int(segment.start_index) : int(segment.end_index)]
        for segment in layout.text_anchor.text_segments
    )


# If you already have a Document AI Processor in your project, assign the full processor resource name here.
processor_name = "projects/summarizepro/locations/us/processors/5e327e2a04a1dba7"
chunk_size = 5000
extracted_data: List[Dict] = []

# Loop through each PDF file in the "docai" directory.
for path in glob.glob("docai/*.pdf"):
    # Extract the file name and type from the path.
    file_name, file_type = os.path.splitext(path)

    print(f"Processing {file_name}")

    # Process the document.
    document = process_document(processor_name, file_path=path)

    if not document:
        print("Processing did not complete successfully.")
        continue

    # Split the text into chunks based on paragraphs.
    document_chunks = [
        layout_to_text(paragraph.layout, document.text)
        for page in document.pages
        for paragraph in page.paragraphs
    ]

    # Can also split into chunks by page or blocks.
    # document_chunks = [page.text for page in wrapped_document.pages]
    # document_chunks = [block.text for page in wrapped_document.pages for block in page.blocks]

    # Loop through each chunk and create a dictionary with metadata and content.
    for chunk_number, chunk_content in enumerate(document_chunks, start=1):
        # Append the chunk information to the extracted_data list.
        extracted_data.append(
            {
                "file_name": file_name,
                "file_type": file_type,
                "chunk_number": chunk_number,
                "content": chunk_content,
            }
        )


    # Convert extracted_data to a sorted Pandas DataFrame
    pdf_data = (
        pd.DataFrame.from_dict(extracted_data)
        .sort_values(by=["file_name"])
        .reset_index(drop=True)
    )

    pdf_data.head()

    # Define the maximum number of characters in each chunk.
    chunk_size = 5000

    pdf_data_sample = pdf_data.copy()

    # Remove all non-alphabets and numbers from the data to clean it up.
    # This is harsh cleaning. You can define your custom logic for cleansing here.
    pdf_data_sample["content"] = pdf_data_sample["content"].apply(
        lambda x: re.sub("[^A-Za-z0-9]+", " ", x)
    )

    # Apply chunk splitting logic to each row of content in the DataFrame.
    pdf_data_sample["chunks"] = pdf_data_sample["content"].apply(
        lambda row: textwrap.wrap(row, width=chunk_size)
    )

    # Now, each row in 'chunks' contains list of all chunks and hence we need to explode them into individual rows.
    pdf_data_sample = pdf_data_sample.explode("chunks")

    # Sort and reset index
    pdf_data_sample = pdf_data_sample.sort_values(by=["file_name"]).reset_index(drop=True)
    pdf_data_sample.head()

    print("The original dataframe has :", pdf_data.shape[0], " rows without chunking")
    print("The chunked dataframe has :", pdf_data_sample.shape[0], " rows with chunking")

generation_model = TextGenerationModel.from_pretrained("text-bison@001")
embedding_model = TextEmbeddingModel.from_pretrained("textembedding-gecko@001")

# This decorator is used to handle exceptions and apply exponential backoff in case of ResourceExhausted errors.
# It means the function will be retried with increasing time intervals in case of this specific exception.
@retry(wait=wait_random_exponential(min=1, max=60), stop=stop_after_attempt(5))
def text_generation_model_with_backoff(**kwargs):
    return generation_model.predict(**kwargs).text


@retry(wait=wait_random_exponential(min=10, max=120), stop=stop_after_attempt(5))
def embedding_model_with_backoff(text=[]):
    embeddings = embedding_model.get_embeddings(text)
    return [each.values for each in embeddings][0]

pdf_data_sample = pdf_data_sample.dropna(subset=['chunks'])

pdf_data_sample["embedding"] = pdf_data_sample["chunks"].apply(
    lambda x: embedding_model_with_backoff([x])
)
print(pdf_data_sample["embedding"])
pdf_data_sample["embedding"] = pdf_data_sample.embedding.apply(np.array)
pdf_data_sample.head(2)

def get_context_from_question(
    question: str, vector_store: pd.DataFrame, sort_index_value: int = 2
) -> Tuple[str, pd.DataFrame]:
    query_vector = np.array(embedding_model_with_backoff([question]))
    vector_store["dot_product"] = vector_store["embedding"].apply(
        lambda row: np.dot(row, query_vector)
    )
    top_matched = vector_store.sort_values(by="dot_product", ascending=False)[
        :sort_index_value
    ].index
    top_matched_df = vector_store.loc[top_matched, ["file_name", "chunks"]]
    context = "\n".join(top_matched_df["chunks"].values)
    return context, top_matched_df

# your question for the documents
question = "could you summarize the content of this pdf?"

# get the custom relevant chunks from all the chunks in vector store.
context, top_matched_df = get_context_from_question(
    question,
    vector_store=pdf_data_sample,
    sort_index_value=2,  # Top N results to pick from embedding vector search
)
# top 5 data that has been picked by model based on user question. This becomes the context.
top_matched_df

# Prompt for Q&A which takes the custom context found in last step.
prompt = f""" Answer the question using the provided context. Attempt to give a full answer.\n\n
            Context: \n {context}?\n
            Question: \n {question} \n
            Answer:
          """

# Call the PaLM API on the prompt.
print("PaLM Predicted:", text_generation_model_with_backoff(prompt=prompt), "\n\n")