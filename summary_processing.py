from __future__ import annotations
import sys
from tenacity import retry, stop_after_attempt, wait_random_exponential
import numpy as np
import pandas as pd
from typing import Tuple
from vertexai.language_models import TextEmbeddingModel, TextGenerationModel

file = sys.argv[1]

pdf_data_sample = pd.read_pickle(f'embeddings/{file}.pkl')

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

def get_summary_from_document(
    vector_store: pd.DataFrame, summary_length: int = 3
) -> Tuple[str, pd.DataFrame]:
    # Calculate importance scores for each chunk using a more sophisticated method
    # For example, using TF-IDF or TextRank algorithms
    # Here, we'll use a simplified example with a random score for demonstration
    vector_store["importance_score"] = np.random.rand(len(vector_store))

    # Sort chunks based on importance score and select top ones for summary
    top_chunks = vector_store.sort_values(by="importance_score", ascending=False)[
        :summary_length
    ]["chunks"].values
    summary = "\n".join(top_chunks)
    return summary

truncated_responses = []

def generate_summary(prompt: str, summary: str) -> str:
    while True:
        # Call the PaLM API on the prompt to generate additional content or refine the summary
        response = text_generation_model_with_backoff(prompt=prompt)

        # Check if the response is truncated
        if "...(truncated)" in response:
            print("Response is truncated, continuing with additional context...")
            # Extract the non-truncated part of the response
            truncated_part = response.split("...(truncated)")[0]
            truncated_responses.append(truncated_part)

            # Rerun with additional context (previous truncated responses + current summary)
            prompt = f"Generate a summary. \n Context:\n{summary}\n"
            for truncated_response in truncated_responses:
                prompt += f"\n\n Additional Context:\n{truncated_response}"
        else:
            # Response is not truncated, return the complete response
            return response

# Generate summary from the document
summary = get_summary_from_document(pdf_data_sample, summary_length=3)
print("Generated Summary:", summary)

# Prompt for text generation using the generated summary
prompt = f"Generate a summary. \n Context:\n{summary}\n"
# Generate summary with additional context if response is truncated
response = generate_summary(prompt, summary)
print("PaLM Predicted:", response, "\n\n")