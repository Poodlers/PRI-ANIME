import firebase_admin
from firebase_admin import credentials, firestore
import json

# from firebase project settings
cred = credentials.Certificate(
    'anime-database-pri-firebase-adminsdk-tqtzj-ea69f4853d.json')
default_app = firebase_admin.initialize_app(cred)

db = firebase_admin.firestore.client()

# add your collections manually
collection = "anime_entries"
dict4json = []
n_documents = 0


animeCollection = db.collection('anime_entries')
charactersCollection = db.collection('anime_characters')
categoriesColection = db.collection("anime_categories")
anime_VA_charaCollection = db.collection('anime_VA_chara_relationship')
VACollection = db.collection('anime_voice_actors')
staffCollection = db.collection('anime_staff')
anime_mediaCollection = db.collection('anime_media_relationships')
anime_reviewsCollection = db.collection('anime_reviews')
anime_productions_relationsCollection = db.collection(
    'production_relationships')


def handle_genre(genre_entry):
    return genre_entry["name"]


def handle_category(category_id):
    category_doc = categoriesColection.where(
        'id', '==', category_id).stream()

    for doc in category_doc:
        category_dict = doc.to_dict()
        category_dict.pop("id", None)
        return category_dict


def handle_reviews(review_entry):
    reviews_doc = anime_reviewsCollection.where(
        'id', '==', review_entry['id']).stream()

    for doc in reviews_doc:
        review_dict = doc.to_dict()
        review_dict.pop("id", None)
        return review_dict


def handle_media_relationships(media_relationship_entry):
    media_relationship = anime_mediaCollection.where(
        'id', '==', media_relationship_entry["id"]).stream()

    for doc in media_relationship:
        media_rel_dict = doc.to_dict()
        media_rel_dict.pop("id", None)
        media_rel_dict["media_rel_role"] = media_relationship_entry["role"]
        return media_rel_dict


def handle_prod_relationships(prod_relationship_entry):
    prod_relationship = anime_productions_relationsCollection.where(
        'id', '==', prod_relationship_entry["id"]).stream()

    for doc in prod_relationship:
        prod_rel_dict = doc.to_dict()
        prod_rel_dict.pop("id", None)
        prod_rel_dict["production_role"] = prod_relationship_entry["role"]
        return prod_rel_dict


def handle_characters(character_entry):
    char_Obj = charactersCollection.where(
        'id', '==', character_entry["id"]).stream()

    for doc in char_Obj:
        character_dict = doc.to_dict()
        character_dict.pop("id", None)
        character_dict.pop("appears_on", None)
        character_dict["character_role"] = character_entry["role"]
        return character_dict


firstHalf = animeCollection.where('id', '<', '10000').stream()
secondHalf = animeCollection.where('id', '>=', '10000').stream()

for document in firstHalf:
    docdict = document.to_dict()
    docdict["genre"] = list(map(handle_genre, docdict["genre"]))
    if docdict.get("Categories", 0) != 0:
        docdict["Categories"] = list(
            map(handle_category, docdict["Categories"]))
    docdict["reviews"] = list(map(handle_reviews, docdict["reviews"]))
    docdict["media_relationships"] = list(map(
        handle_media_relationships, docdict["media_relationships"]))
    docdict["production_relationships"] = list(map(
        handle_prod_relationships, docdict["production_relationships"]))
    docdict["characters"] = list(map(handle_characters, docdict["characters"]))
    dict4json.append(docdict)
    n_documents += 1
    print(n_documents)

jsonfromdict = json.dumps(dict4json)

path_filename = "JSON-DATA/animeEntries4.json"
print("Downloaded 1 collections, %d documents and now writing %d json characters to %s" %
      (n_documents, len(jsonfromdict), path_filename))
with open(path_filename, 'w') as the_file:
    the_file.write(jsonfromdict)
