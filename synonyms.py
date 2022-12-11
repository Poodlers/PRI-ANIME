import requests
import json

url = "http://localhost:8983/solr/animeEntries/schema/analysis/synonyms/en"
payload = json.dumps({
    "tv": [
        "television"
    ]
})
headers = {'Content-type': 'application/json'}
response = requests.request("PUT", url, headers=headers, data=payload)
print(response.text)