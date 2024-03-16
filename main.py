import re
from typing import Optional
from google.api_core.client_options import ClientOptions
from google.api_core.exceptions import InternalServerError, RetryError
from google.cloud import documentai, storage
from google.cloud.documentai_v1 import Document
from tenacity import retry, stop_after_attempt, wait_random_exponential
from google.api_core.client_options import ClientOptions
from google.cloud import documentai, storage
import numpy as np
from typing import Dict, List
import pandas as pd
import re
import textwrap
from typing import List
from vertexai.language_models import TextEmbeddingModel


# Set your project and location
project_id = "summarizepro"
location = "us"  # Change this to your location

# Define your Document AI Processor ID
processor_id = "a7d60edf0e35ae07"

# Set the GCS URI where you want to store the processed documents
gcs_output_uri = "gs://sprobucket/output/"  # Must end with a trailing slash `/`

# Define the path to your large PDF file on GCS
gcs_input_uri = "gs://sprobucket/test.pdf"  # Format: gs://bucket/directory/file.pdf

# Optional parameters
processor_version_id = None
input_mime_type = "application/pdf"
field_mask = "text"

# Set timeout for the operation
timeout = 600  # Increase timeout if needed

def batch_process_documents(
    project_id: str,
    location: str,
    processor_id: str,
    gcs_output_uri: str,
    processor_version_id: Optional[str] = None,
    gcs_input_uri: Optional[str] = None,
    input_mime_type: Optional[str] = None,
    field_mask: Optional[str] = None,
    timeout: int = 400,
) -> None:
    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
    client = documentai.DocumentProcessorServiceClient(client_options=opts)

    # Define input documents
    gcs_document = documentai.GcsDocument(gcs_uri=gcs_input_uri, mime_type=input_mime_type)
    gcs_documents = documentai.GcsDocuments(documents=[gcs_document])
    input_config = documentai.BatchDocumentsInputConfig(gcs_documents=gcs_documents)

    # Define output configuration
    gcs_output_config = documentai.DocumentOutputConfig.GcsOutputConfig(
        gcs_uri=gcs_output_uri, field_mask=field_mask
    )
    output_config = documentai.DocumentOutputConfig(gcs_output_config=gcs_output_config)

    if processor_version_id:
        name = client.processor_version_path(
            project_id, location, processor_id, processor_version_id
        )
    else:
        name = client.processor_path(project_id, location, processor_id)

    request = documentai.BatchProcessRequest(
        name=name,
        input_documents=input_config,
        document_output_config=output_config,
    )

    try:
        print("Initiating batch processing...")
        operation = client.batch_process_documents(request)
        operation.result(timeout=timeout)
        print("Batch processing completed.")
    except (RetryError, InternalServerError) as e:
        print(f"Error during batch processing: {e}")

    aggregated_text = []

    # Retrieve output documents
    storage_client = storage.Client()
    for process in operation.metadata.individual_process_statuses:
        output_bucket, output_prefix = process.output_gcs_destination.split("gs://")[1].split("/", 1)
        output_blobs = storage_client.list_blobs(output_bucket, prefix=output_prefix)
        for blob in output_blobs:
            if blob.content_type == "application/json":
                # Download JSON file and process each chunk
                json_bytes = blob.download_as_bytes()
                document = Document.from_json(json_bytes, ignore_unknown_fields=True)
                aggregated_text.append(document.text)

    return aggregated_text



document_chunks = text=batch_process_documents(
    project_id,
    location,
    processor_id,
    gcs_output_uri,
    processor_version_id,
    gcs_input_uri,
    input_mime_type,
    field_mask,
    timeout,
)

extracted_data: List[Dict] = []

# Process each chunk of the document here
# This function will be called for each chunk of the large document


# Can also split into chunks by page or blocks.
# document_chunks = [page.text for page in wrapped_document.pages]
# document_chunks = [block.text for page in wrapped_document.pages for block in page.blocks]

# Loop through each chunk and create a dictionary with metadata and content.
for chunk_number, chunk_content in enumerate(document_chunks, start=1):
    # Append the chunk information to the extracted_data list.
    extracted_data.append(
        {
            "file_name": "test.pdf",
            "chunk_number": chunk_number,
            "content": chunk_content,
        }
    )

print(extracted_data)
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
pdf_data_sample.to_pickle(f'embeddings/test.pkl')

print("Embeddings saved successfully.")

# from __future__ import annotations
# import backoff
# from tenacity import retry, stop_after_attempt, wait_random_exponential
# from google.api_core.exceptions import ResourceExhausted
# from google.api_core.client_options import ClientOptions
# from google.api_core.exceptions import AlreadyExists
# from google.cloud import documentai
# import numpy as np
# import glob
# import os
# from typing import Dict, List
# import pandas as pd
# from logging import error
# import re
# import textwrap
# from typing import Tuple, List
# import vertexai
# from vertexai.language_models import TextEmbeddingModel, TextGenerationModel

# # run this in terminal. will prompt you to login via a google account for authentication.
# # set GOOGLE_APPLICATION_CREDENTIALS=/Users/moses/google-cloud-sdk/summarizepro-f498a9ddcd4e.json
# # gcloud config set project "summarizepro"
# # gcloud auth activate-service-account summarizepro-685@summarizepro.iam.gserviceaccount.com --key-file /Users/moses/google-cloud-sdk/summarizepro-f498a9ddcd4e.json
# # gcloud projects add-iam-policy-binding summarizepro --member serviceAccount:summarizepro-685@summarizepro.iam.gserviceaccount.com --role roles/reader
# # gcloud projects add-iam-policy-binding summarizepro --member user:saadshahidqavi2003@gmail.com --role roles/reader
# # gcloud services enable documentai.googleapis.com storage.googleapis.com aiplatform.googleapis.com
# # gsutil -m cp -r gs://github-repo/documents/docai

# # gcloud projects add-iam-policy-binding summarizepro \
# # --member serviceAccount:summarizepro-685@summarizepro.iam.gserviceaccount.com \
# # --role roles/documentai.apiUser

# # TODO(developer): Edit these variables before running the code.
# project_id = "summarizepro"

# # See https://cloud.google.com/document-ai/docs/regions for all options.
# location = "us"

# # Must be unique per project, e.g.: "My Processor"
# processor_display_name = "TestProcessor2"

# # You must set the `api_endpoint` if you use a location other than "us".
# client_options = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")


# # def create_processor(
# #     project_id: str, location: str, processor_display_name: str
# # ) -> documentai.Processor:
# #     client = documentai.DocumentProcessorServiceClient(client_options=client_options)

# #     # The full resource name of the location
# #     # e.g.: projects/project_id/locations/location
# #     parent = client.common_location_path(project_id, location)

# #     # Create a processor
# #     return client.create_processor(
# #         parent=parent,
# #         processor=documentai.Processor(
# #             display_name=processor_display_name, type_="OCR_PROCESSOR"
# #         ),
# #     )

# # runs function to create docai processor
# # try:
# #     processor = create_processor(project_id, location, processor_display_name)
# #     print(f"Created Processor {processor.name}")
# # except AlreadyExists as e:
# #     print(
# #         f"Processor already exits, change the processor name and rerun this code. {e.message}"
# #     )

# def process_document(processor_name: str,file_path: str) -> documentai.Document:
#     client = documentai.DocumentProcessorServiceClient(client_options=client_options)

#     # Read the file into memory
#     with open(file_path, "rb") as image:
#         image_content = image.read()

#     # Load Binary Data into Document AI RawDocument Object
#     raw_document = documentai.RawDocument(
#         content=image_content, mime_type="application/pdf"
#     )

#     # Configure the process request
#     request = documentai.ProcessRequest(name=processor_name, raw_document=raw_document)

#     result = client.process_document(request=request)

#     return result.document


# def layout_to_text(layout: documentai.Document.Page.Layout, text: str) -> str:
#     """
#     Document AI identifies text in different parts of the document by their
#     offsets in the entirety of the document"s text. This function converts
#     offsets to a string.
#     """
#     # If a text segment spans several lines, it will
#     # be stored in different text segments.
#     return "".join(
#         text[int(segment.start_index) : int(segment.end_index)]
#         for segment in layout.text_anchor.text_segments
#     )


# # If you already have a Document AI Processor in your project, assign the full processor resource name here.
# processor_name = "projects/summarizepro/locations/us/processors/5e327e2a04a1dba7"
# chunk_size = 5000
# extracted_data: List[Dict] = []

# # Loop through each PDF file in the "docai" directory.
# for path in glob.glob("docai/*.pdf"):
#     # Extract the file name and type from the path.
#     file_name, file_type = os.path.splitext(path)

#     print(f"Processing {file_name}")

#     # Process the document.
#     document = process_document(processor_name, file_path=path)

#     if not document:
#         print("Processing did not complete successfully.")
#         continue

#     # Split the text into chunks based on paragraphs.
#     document_chunks = [
#         layout_to_text(paragraph.layout, document.text)
#         for page in document.pages
#         for paragraph in page.paragraphs
#     ]

#     # Can also split into chunks by page or blocks.
#     # document_chunks = [page.text for page in wrapped_document.pages]
#     # document_chunks = [block.text for page in wrapped_document.pages for block in page.blocks]

#     # Loop through each chunk and create a dictionary with metadata and content.
#     for chunk_number, chunk_content in enumerate(document_chunks, start=1):
#         # Append the chunk information to the extracted_data list.
#         extracted_data.append(
#             {
#                 "file_name": file_name,
#                 "file_type": file_type,
#                 "chunk_number": chunk_number,
#                 "content": chunk_content,
#             }
#         )


#     # Convert extracted_data to a sorted Pandas DataFrame
#     pdf_data = (
#         pd.DataFrame.from_dict(extracted_data)
#         .sort_values(by=["file_name"])
#         .reset_index(drop=True)
#     )

#     pdf_data.head()

#     # Define the maximum number of characters in each chunk.
#     chunk_size = 5000

#     pdf_data_sample = pdf_data.copy()

#     # Remove all non-alphabets and numbers from the data to clean it up.
#     # This is harsh cleaning. You can define your custom logic for cleansing here.
#     pdf_data_sample["content"] = pdf_data_sample["content"].apply(
#         lambda x: re.sub("[^A-Za-z0-9]+", " ", x)
#     )

#     # Apply chunk splitting logic to each row of content in the DataFrame.
#     pdf_data_sample["chunks"] = pdf_data_sample["content"].apply(
#         lambda row: textwrap.wrap(row, width=chunk_size)
#     )

#     # Now, each row in 'chunks' contains list of all chunks and hence we need to explode them into individual rows.
#     pdf_data_sample = pdf_data_sample.explode("chunks")

#     # Sort and reset index
#     pdf_data_sample = pdf_data_sample.sort_values(by=["file_name"]).reset_index(drop=True)
#     pdf_data_sample.head()

#     print("The original dataframe has :", pdf_data.shape[0], " rows without chunking")
#     print("The chunked dataframe has :", pdf_data_sample.shape[0], " rows with chunking")

# generation_model = TextGenerationModel.from_pretrained("text-bison@001")
# embedding_model = TextEmbeddingModel.from_pretrained("textembedding-gecko@001")

# # This decorator is used to handle exceptions and apply exponential backoff in case of ResourceExhausted errors.
# # It means the function will be retried with increasing time intervals in case of this specific exception.
# @retry(wait=wait_random_exponential(min=1, max=60), stop=stop_after_attempt(5))
# def text_generation_model_with_backoff(**kwargs):
#     return generation_model.predict(**kwargs).text


# @retry(wait=wait_random_exponential(min=10, max=120), stop=stop_after_attempt(5))
# def embedding_model_with_backoff(text=[]):
#     embeddings = embedding_model.get_embeddings(text)
#     return [each.values for each in embeddings][0]

# pdf_data_sample = pdf_data_sample.dropna(subset=['chunks'])

# pdf_data_sample["embedding"] = pdf_data_sample["chunks"].apply(
#     lambda x: embedding_model_with_backoff([x])
# )
# print(pdf_data_sample["embedding"])
# pdf_data_sample["embedding"] = pdf_data_sample.embedding.apply(np.array)
# pdf_data_sample.head(2)

# def get_context_from_question(
#     question: str, vector_store: pd.DataFrame, sort_index_value: int = 2
# ) -> Tuple[str, pd.DataFrame]:
#     query_vector = np.array(embedding_model_with_backoff([question]))
#     vector_store["dot_product"] = vector_store["embedding"].apply(
#         lambda row: np.dot(row, query_vector)
#     )
#     top_matched = vector_store.sort_values(by="dot_product", ascending=False)[
#         :sort_index_value
#     ].index
#     top_matched_df = vector_store.loc[top_matched, ["file_name", "chunks"]]
#     context = "\n".join(top_matched_df["chunks"].values)
#     return context, top_matched_df

# # your question for the documents
# question = "could you summarize the content of this pdf?"

# # get the custom relevant chunks from all the chunks in vector store.
# context, top_matched_df = get_context_from_question(
#     question,
#     vector_store=pdf_data_sample,
#     sort_index_value=2,  # Top N results to pick from embedding vector search
# )
# # top 5 data that has been picked by model based on user question. This becomes the context.
# top_matched_df

# # Prompt for Q&A which takes the custom context found in last step.
# prompt = f""" Answer the question using the provided context. Attempt to give a full answer.\n\n
#             Context: \n {context}?\n
#             Question: \n {question} \n
#             Answer:
#           """

# # Call the PaLM API on the prompt.
# print("PaLM Predicted:", text_generation_model_with_backoff(prompt=prompt), "\n\n")