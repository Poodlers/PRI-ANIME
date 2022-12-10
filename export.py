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
animeCompanies = db.collection('anime_companies_studios')
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
        category_dict["category_name"] = category_dict["tittle"]
        category_dict["category_description"] = category_dict["description"]
        category_dict["total_media_count"] = category_dict["totalMediaCount"]
        category_dict.pop("tittle", None)
        category_dict.pop("totalMediaCount", None)
        category_dict.pop("description", None)
        return category_dict


def handle_reviews(review_entry):
    reviews_doc = anime_reviewsCollection.where(
        'id', '==', review_entry['id']).stream()

    for doc in reviews_doc:
        review_dict = doc.to_dict()
        review_dict.pop("animeID", None)
        return review_dict


def handle_media_relationships(media_relationship_entry):
    media_relationship = anime_mediaCollection.where(
        'id', '==', media_relationship_entry["id"]).stream()

    for doc in media_relationship:
        media_rel_dict = doc.to_dict()

        media_rel_dict["id_dest"] = media_rel_dict["destinationInfo"]["idDest"]
        media_rel_dict["type_dest"] = media_rel_dict["destinationInfo"]["type"]
        media_rel_dict.pop("destinationInfo", None)
        media_rel_dict["media_rel_role"] = media_relationship_entry["role"]
        media_rel_dict.pop("role", None)
        media_rel_dict.pop("sourceID", None)
        return media_rel_dict


def handle_prod_relationships(prod_relationship_entry):
    prod_relationship = anime_productions_relationsCollection.where(
        'id', '==', prod_relationship_entry["id"]).stream()

    for doc in prod_relationship:
        prod_rel_dict = doc.to_dict()

        prod_rel_dict.pop("role", None)
        prod_rel_dict.pop("animeID", None)
        companyName = animeCompanies.where(
            'id', '==', prod_rel_dict["companyID"]).stream()
        for company in companyName:
            company = company.to_dict()
            prod_rel_dict["companyName"] = company["name"]
        prod_rel_dict.pop("companyID", None)

        prod_rel_dict["production_role"] = prod_relationship_entry["role"]
        return prod_rel_dict


def handle_characters(character_entry):
    char_Obj = charactersCollection.where(
        'id', '==', character_entry["id"]).stream()

    for doc in char_Obj:
        character_dict = doc.to_dict()
        character_dict["voice_actors"] = []
        # search from anime_VA_chara_rel
        anime_VA_chara = anime_VA_charaCollection.where(
            'charID', '==', character_entry["id"]).stream()
        for VAs in anime_VA_chara:
            VAs = VAs.to_dict()
            VA = VACollection.where(
                'id', '==', VAs["VAId"]).stream()
            new_VA_entry = {}
            new_VA_entry["VA_language"] = VAs["lang"]
            new_VA_entry["id"] = VAs["VAId"]
            for VAdoc in VA:
                VAdoc = VAdoc.to_dict()

                new_VA_entry["VA_description"] = VAdoc["description"]
                new_VA_entry["VA_name"] = VAdoc["name"]
                new_VA_entry["VA_portrait"] = VAdoc.get("portrait", None)
                character_dict["voice_actors"].append(new_VA_entry)

        character_dict.pop("appears_on", None)
        character_dict["character_role"] = character_entry["role"]
        character_dict["character_description"] = character_dict.get(
            "description", None)
        character_dict.pop("description", None)
        return character_dict


def handle_staff(staff_entry):
    staff_obj = staffCollection.where(
        'id', '==', staff_entry["id"]).stream()
    for staff_doc in staff_obj:
        staff_dict = staff_doc.to_dict()
        staff_dict["staff_role"] = staff_entry["role"]

        return staff_dict
    return None


current_iter = 2

iterations = [(1, u'1'), (2, u'13607'), (3, u'3997'),
              (4, u'4371'), (5, u'5135'), (6, u'8158')]

iter_counter, last_id = iterations[current_iter]

next_query = (
    animeCollection
    .order_by(u'id')
    .start_after({
        u'id': last_id
    })
    .limit(3000)
).stream()

for document in next_query:
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
    docdict["characters"] = list(
        map(handle_characters, docdict["characters"]))

    docdict["staff"] = [x for x in list(
        map(handle_staff, docdict["staff"])) if x is not None]
    dict4json.append(docdict)
    n_documents += 1
    print(docdict["id"])

jsonfromdict = json.dumps(dict4json)

path_filename = f"JSON-DATA/animeReal{iter_counter}.json"
print("Downloaded 1 collections, %d documents and now writing %d json characters to %s" %
      (n_documents, len(jsonfromdict), path_filename))
with open(path_filename, 'w') as the_file:
    the_file.write(jsonfromdict)
