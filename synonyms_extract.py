import json
import re
from nltk.tokenize import WordPunctTokenizer
from nltk.corpus import stopwords
from nltk.corpus import words
from nltk.corpus import wordnet



def analyze(element, field):
    all = []
    
    if field in element:
        text = element[field]
        if text != None:
            word_punct_token = WordPunctTokenizer().tokenize(text)
            clean_token=[]
            for token in word_punct_token:
                token = token.lower()
                # remove any value that are not alphabetical
                new_token = re.sub(r'[^a-zA-Z]+', '', token) 
                # remove empty value and single character value
                if new_token != "" and len(new_token) >= 2: 
                    vowels=len([v for v in new_token if v in "aeiou"])
                    if vowels != 0: # remove line that only contains consonants
                        clean_token.append(new_token)
            stop_words = stopwords.words('english')
            tokens = [x for x in clean_token if x not in stop_words]
            all += tokens
    return all


f = open("JSON-DATA/animeReal1_clean.json", "r", encoding="utf8")
one = f.read()
f1 = open("JSON-DATA/animeReal2_clean.json", "r", encoding="utf8")
two = f1.read()
f2 = open("JSON-DATA/animeReal3_clean.json", "r", encoding="utf8")
three = f2.read()
f3 = open("JSON-DATA/animeReal4_clean.json", "r", encoding="utf8")
four = f3.read()
f4 = open("JSON-DATA/animeReal5_clean.json", "r", encoding="utf8")
five = f4.read()
f5 = open("JSON-DATA/animeReal6_clean.json", "r", encoding="utf8")
six = f5.read()


json_object = [json.loads(one),json.loads(two),json.loads(three),json.loads(four),json.loads(five),json.loads(six)]

word_list = []
for obj in json_object:
    for entry in obj:
        if "reviews" in entry:
            reviews = entry["reviews"]
            for element in reviews:
                word_list += analyze(element, "content")
        word_list += analyze(entry, "synopsis")
        if "Categories" in entry:
            categories = entry["Categories"]
            for element in categories:
                word_list += analyze(element, "category_description")
        if "characters" in entry:
            characters = entry["characters"]
            for element in characters:
                word_list += analyze(element, "character_description")
                if "voice_actors" in element:
                    vas = element["voice_actors"]  
                    for va in vas:
                        word_list += analyze(va, "VA_description")

word_list = set(word_list)


f = open("JSON-DATA/synonyms.json", "w", encoding="utf8")


dict = {}
for word in word_list:
    synonyms = []
    for syn in wordnet.synsets(word):
        for i in syn.lemmas():
            synonyms.append(i.name())
    if len(synonyms) != 0:
        dict[word] = synonyms
f.write(json.dumps(dict))