import firebase_admin
from firebase_admin import credentials, firestore
import json

# from firebase project settings
cred = credentials.Certificate(
    'anime-database-pri-firebase-adminsdk-tqtzj-ea69f4853d.json')
default_app = firebase_admin.initialize_app(cred)

db = firebase_admin.firestore.client()

# add your collections manually
collection = "anime_media_relationships"
dict4json = []
n_documents = 0

collection_obj = db.collection(collection).get()

for document in collection_obj:
    docdict = document.to_dict()
    dict4json.append(docdict)
    n_documents += 1

jsonfromdict = json.dumps(dict4json)

path_filename = "JSON-DATA/anime_media_relationships.json"
print("Downloaded 1 collections, %d documents and now writing %d json characters to %s" %
      (n_documents, len(jsonfromdict), path_filename))
with open(path_filename, 'w') as the_file:
    the_file.write(jsonfromdict)
