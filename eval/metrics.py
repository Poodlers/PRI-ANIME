# SETUP
import matplotlib.pyplot as plt
from sklearn.metrics import PrecisionRecallDisplay
import numpy as np
import json
import requests
import pandas as pd


query_attempt = 'anime_space_battles_synopsis_field_boost'


QRELS_FILE = "./qrels/anime_space_battles_qrels.txt"

# CHARACTER: GOKU
# http://localhost:8983/solr/animeEntries/select?fl=title_en_jp%2C%20synopsis%2Cid&fq=%7B!join%20from%3Did%20fromIndex%3DanimeCharacters%20to%3Dcharacters.id%7Dcanonical_name%3A%22Gokuu%20Son%22&indent=true&q.op=OR&q=*%3A*&rows=40
# http://localhost:8983/solr/animeEntries/select?fl=id&indent=true&q.op=OR&q=synopsis%3A%22Goku%22&rows=40
# http://localhost:8983/solr/animeEntries/select?fl=id&fq=%7B!join%20from%3Did%20fromIndex%3DanimeCharacters%20to%3Dcharacters.id%7Dcanonical_name%3AGokuu*&indent=true&q.op=OR&q=*%3A*&rows=55
# http://localhost:8983/solr/animeEntries/select?fl=id&fq=%7B!join%20from%3Did%20fromIndex%3DanimeCharacters%20to%3Dcharacters.id%7Dcanonical_name%3AGokuu*&indent=true&q.op=OR&q=synopsis%3Agoku*&rows=40


# ANIME BY NAME
# http://localhost:8983/solr/animeEntries/select?fl=id&indent=true&q.op=OR&q=title_en_jp%3ADragon%20Ball&rows=100
# http://localhost:8983/solr/animeEntries/select?fl=id&indent=true&q.op=OR&q=title_en_jp%3A%22Dragon%20Ball%22&rows=100

# ANIME by SPACE BATTLES

# http://localhost:8983/solr/animeEntries/select?fl=id%2C%20title_en_jp&indent=true&q.op=OR&q=%2Bsynopsis%3Aspace%2C%20%2Bsynopsis%3Abattle%2C%20title_en_jp%3A%20space%2C%20title_en_jp%3A%20battle&rows=100
# http://localhost:8983/solr/animeEntries/select?fl=id%2C%20title_en_jp&fq=%7B!join%20from%3Did%20fromIndex%3DanimeCategories%20to%3DCategories%7Dtittle%3A(%2Bspace%20%2Bbattles)&indent=true&q.op=OR&q=*%3A*&rows=100
# http://localhost:8983/solr/animeEntries/select?fl=id%2C%20title_en_jp%2C%20genre.name&fq=%7B!join%20from%3Did%20fromIndex%3DanimeCategories%20to%3DCategories%7Dtittle%3ABattles&indent=true&q.op=OR&q=genre.name%3Aspace%20OR%20synopsis%3A(battle%20space)&rows=100
# http://localhost:8983/solr/animeEntries/select?defType=edismax&fl=id%2C%20title_en_jp%2C&fq=%7B!join%20from%3Did%20fromIndex%3DanimeCategories%20to%3DCategories%7Dtittle%3ABattles&indent=true&q.op=OR&q=genre.name%3Aspace%20OR%20synopsis%3A(battle%20space)&qf=genre.name%5E10&rows=100
QUERY_URL = "http://localhost:8983/solr/animeEntries/select?defType=edismax&fl=id%2C%20title_en_jp%2C&fq=%7B!join%20from%3Did%20fromIndex%3DanimeCategories%20to%3DCategories%7Dtittle%3ABattles&indent=true&q.op=OR&q=genre.name%3Aspace%20OR%20synopsis%3A(battle%20space)&qf=genre.name%5E10&rows=100"

# Read qrels to extract relevant documents
relevant = list(map(lambda el: el.strip(), open(QRELS_FILE).readlines()))
# Get query results from Solr instance
results = requests.get(QUERY_URL).json()['response']['docs']


# METRICS TABLE
# Define custom decorator to automatically calculate metric based on key
metrics = {}
def metric(f): return metrics.setdefault(f.__name__, f)


@metric
def ap(results, relevant):
    """Average Precision"""
    precision_values = [
        len([
            doc
            for doc in results[:idx]
            if doc['id'] in relevant
        ]) / idx
        for idx in range(1, len(results))
    ]

    return sum(precision_values)/len(precision_values)


@metric
def p10(results, relevant, n=10):
    """Precision at N"""
    return len([doc for doc in results[:n] if doc['id'] in relevant])/n


def calculate_metric(key, results, relevant):
    return metrics[key](results, relevant)


# Define metrics to be calculated
evaluation_metrics = {
    'ap': 'Average Precision',
    'p10': 'Precision at 10 (P@10)'
}

# Calculate all metrics and export results as LaTeX table
df = pd.DataFrame([['Metric', 'Value']] +
                  [
    [evaluation_metrics[m], calculate_metric(m, results, relevant)]
    for m in evaluation_metrics
]
)

with open(f'results_{query_attempt}.tex', 'w') as tf:
    tf.write(df.style.to_latex())

# PRECISION-RECALL CURVE
# Calculate precision and recall values as we move down the ranked list
precision_values = [
    len([
        doc
        for doc in results[:idx]
        if doc['id'] in relevant
    ]) / idx
    for idx, _ in enumerate(results, start=1)
]

recall_values = [
    len([
        doc for doc in results[:idx]
        if doc['id'] in relevant
    ]) / len(relevant)
    for idx, _ in enumerate(results, start=1)
]

precision_recall_match = {k: v for k,
                          v in zip(recall_values, precision_values)}

# Extend recall_values to include traditional steps for a better curve (0.1, 0.2 ...)
recall_values.extend([step for step in np.arange(
    0.1, 1.1, 0.1) if step not in recall_values])
recall_values = sorted(set(recall_values))

# Extend matching dict to include these new intermediate steps
for idx, step in enumerate(recall_values):
    if step not in precision_recall_match:
        if recall_values[idx-1] in precision_recall_match:
            precision_recall_match[step] = precision_recall_match[recall_values[idx-1]]
        else:
            precision_recall_match[step] = precision_recall_match[recall_values[idx+1]]

disp = PrecisionRecallDisplay(
    [precision_recall_match.get(r) for r in recall_values], recall_values)
disp.plot()
plt.savefig(f"precision_recall_{query_attempt}.pdf")
