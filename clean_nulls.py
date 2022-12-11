import json


def remove_nulls(entry, name):
    try:
        if name in entry:
            cat = entry[name]
            newCat = []
            for r in cat:
                if r is not None:
                    newCat.append(r)
            return newCat
        return []
    except:
        print(entry["id"] + " in " + name)


def handle_characters(entry):
    if "characters" in entry:
        chars = entry["characters"]
        newChars = []
        for char in chars:
            new_char = char
            if char is not None:
                if "voice_actors" in char:
                    va = char["voice_actors"]
                    new_va = []
                    for v in va:
                        if v is not None:
                            new_va.append(v)
                    new_char["voice_actors"] = new_va
                newChars.append(new_char)
        return newChars
    return []


f = open("JSON-DATA/animeReal4.json", "r", encoding="utf8")
all_of_it = f.read()

json_object = json.loads(all_of_it)

new_arr = []
for entry in json_object:
    new_entry = entry
    new_entry["reviews"] = remove_nulls(entry, "reviews")
    new_entry["Categories"] = remove_nulls(entry, "Categories")
    new_entry["media_relationships"] = remove_nulls(
        entry, "media_relationships")
    new_entry["production_relationships"] = remove_nulls(
        entry, "production_relationships")
    new_entry["staff"] = remove_nulls(entry, "staff")
    new_entry["characters"] = handle_characters(entry)
    if "title_is_is" in entry:
        if entry["title_is_is"] == "Múmínálfarnir" or entry["title_is_is"] == "Alfréð önd":
            del entry['title_is_is']
    new_arr.append(new_entry)

f = open("JSON-DATA/animeReal4_clean.json", "w", encoding="utf8")

f.write(json.dumps(new_arr))
