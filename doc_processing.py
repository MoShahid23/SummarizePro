from __future__ import annotations
import sys
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
import re
import textwrap
from typing import List
from vertexai.language_models import TextEmbeddingModel, TextGenerationModel

file = sys.argv[1]

project_id = "summarizepro"
location = "us"
processor_id = "a7d60edf0e35ae07"
client_options = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")

batch_requests = []

def process_document(file_path: str) -> documentai.Document:
    client = documentai.DocumentProcessorServiceClient(client_options=client_options)

    # Read the file into memory
    with open(file_path, "rb") as image:
        image_content = image.read()

    # Load Binary Data into Document AI RawDocument Object
    raw_document = documentai.RawDocument(
        content=image_content, mime_type="application/pdf"
    )

    # Configure the process request
    request = documentai.ProcessRequest(name=f"projects/{project_id}/locations/{location}/processors/{processor_id}", raw_document=raw_document)

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
chunk_size = 5000
extracted_data: List[Dict] = []

# Select file from temp/
for path in glob.glob(f"temp/{file}.pdf"):
    # Extract the file name and type from the path.
    file_name, file_type = os.path.splitext(path)

    print(f"Processing {file_name}")

    # Process the document.
    document = process_document(file_path=path)

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

    print(extracted_data)

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

embedding_model = TextEmbeddingModel.from_pretrained("textembedding-gecko@001")

# This decorator is used to handle exceptions and apply exponential backoff in case of ResourceExhausted errors.
# It means the function will be retried with increasing time intervals in case of this specific exception.
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


# Save embeddings to a Numpy binary file
pdf_data_sample.to_pickle(f'embeddings/{file}.pkl')

print("Embeddings saved successfully.")