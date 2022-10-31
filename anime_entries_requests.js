import request from 'request';

import {
  initializeApp,
  applicationDefault,
  cert
} from 'firebase-admin/app';
import {
  getFirestore,
  Timestamp,
  FieldValue
} from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('anime-database-pri-firebase-adminsdk-tqtzj-ea69f4853d.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const categoriesColection = db.collection("anime_categories");

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

function getResponseSync(url) {
  return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (error) reject(error);
      if (response.statusCode != 200) {
        reject('Invalid status code <' + response.statusCode + '>');
      }
      resolve(body);
    });
  });
}


function requestAnimeAttributes(request_body, animeEntry, attName, relevantAttributes) {
  var genreResponse = JSON.parse(request_body).data;
  var genreArray = []

  for (let i = 0; i < genreResponse.length; i++) {
    var attributes = genreResponse[i].attributes
    var attObj = {
      id: genreResponse[i].id
    }
    for (let j = 0; j < relevantAttributes.length; j++) {

      attObj[relevantAttributes[j]] = attributes[relevantAttributes[j]]

    }
    genreArray.push(attObj)
  }

  animeEntry[attName] = genreArray

}

async function parseCategory(request_body, animeEntry) {
  const categories = categoriesColection.doc();
  var genreResponse = JSON.parse(request_body).data;
  var genreArray = []

  for (let i = 0; i < genreResponse.length; i++) {
    var cat = await categoriesColection.where('id', '==', genreResponse[i].id).limit(1).get();
    genreArray.push(genreResponse[i].id)
    if (cat.empty) {
      var category = {
        id: genreResponse[i].id
      }
      var attributes = genreResponse[i].attributes
      category['tittle'] = attributes.title
      category['description'] = attributes.description
      category['totalMediaCount'] = 1
      category['nsfw'] = attributes.nsfw
      await categories.set(category);
    } else {
      const thing = cat.docs[0];
      let tmp = thing.data();
      tmp.totalMediaCount = tmp.totalMediaCount + 1;
      thing.ref.update(tmp);
    }
  }

  animeEntry['Categories'] = genreArray
}

async function parseOneAnime(animeResponse) {

  var animeEntry = {}

  animeEntry["id"] = animeResponse.id
  const animeAttributes = animeResponse.attributes

  const synopsis = animeAttributes.synopsis
  animeEntry["synopsis"] = synopsis

  const titles = animeAttributes.titles

  for (const [key, value] of Object.entries(titles)) {
    animeEntry["title_" + key] = value
  }

  animeEntry["canonical_title"] = animeAttributes.canonicalTitle

  animeEntry["average_rating"] = animeAttributes.averageRating

  animeEntry["favourites_count"] = animeAttributes.favoritesCount

  animeEntry["start_date"] = animeAttributes.startDate

  if (animeAttributes.startDate != null) {
    animeEntry["year"] = animeAttributes.startDate.substring(0, 4)

  }


  animeEntry["end_date"] = animeAttributes.endDate

  animeEntry["popularity_ranking"] = animeAttributes.popularityRank

  animeEntry["rating_ranking"] = animeAttributes.ratingRank

  animeEntry["age_rating"] = animeAttributes.ageRating

  animeEntry["age_rating_guide"] = animeAttributes.ageRatingGuide

  animeEntry["subtype"] = animeAttributes.subtype

  animeEntry["status"] = animeAttributes.status

  if (animeAttributes.posterImage != undefined) {
    animeEntry["original_poster"] = animeAttributes.posterImage.original
  }


  if (animeAttributes.coverImage != undefined) {
    animeEntry["cover_image"] = animeAttributes.coverImage.original
  }

  animeEntry["episode_count"] = animeAttributes.episodeCount

  animeEntry["episode_length"] = animeAttributes.episodeLength

  animeEntry["total_length"] = animeAttributes.totalLength

  animeEntry["trailer_video_link"] = "https://www.youtube.com/watch?v=" + animeAttributes.youtubeVideoId

  animeEntry["show_type"] = animeAttributes.subtype

  animeEntry["nsfw"] = animeAttributes.nsfw

  const relationships = animeResponse.relationships

  var genres_request = relationships.genres.links.related

  await getResponseSync(genres_request).then(
    function (body) {
      requestAnimeAttributes(body, animeEntry, "genre", ["name"])
    }
  )

  var categories_request = relationships.categories.links.related

  await getResponseSync(categories_request).then(
    function (body) {
      parseCategory(body, animeEntry)
    }
  )

  var reviews_request = relationships.reviews.links.related

  await getResponseSync(reviews_request).then(
    function (body) {
      requestAnimeAttributes(body, animeEntry, "reviews", [])
    }
  )

  var characters_request = relationships.characters.links.related

  await getResponseSync(characters_request).then(
    function (body) {
      requestAnimeAttributes(body, animeEntry, "characters", ["role"])
    }
  )

  var staff_request = relationships.staff.links.related

  await getResponseSync(staff_request).then(
    function (body) {
      requestAnimeAttributes(body, animeEntry, "staff", ["role"])
    }
  )

  var produtcions_request = relationships.productions.links.related

  await getResponseSync(produtcions_request).then(
    function (body) {
      requestAnimeAttributes(body, animeEntry, "production_relationships", ["role"])
    }
  )

  var mediaRelationships_request = relationships.mediaRelationships.links.related

  await getResponseSync(mediaRelationships_request).then(
    function (body) {
      requestAnimeAttributes(body, animeEntry, "media_relationships", ["role"])
    }
  )

  animeEntry["episodes_info"] = "https://kitsu.io/api/edge/anime/" + animeResponse.id + "/episodes"

  return animeEntry;

}

const animeYear = process.argv[2];
const animeCountPath = "counters/anime" + animeYear + "_count.txt"
const animeEntriesCollection = db.collection('anime_entries')

if (!fs.existsSync(animeCountPath)) {
  fs.writeFileSync("anime" + animeYear + "_count.txt", "0", {
    encoding: 'utf8',
    flag: 'wx'
  });
}


async function readNextAnimeIntoDb() {
  var countGlobal = fs.readFileSync(animeCountPath, {
    encoding: 'utf8',
    flag: 'r'
  });
  console.log(countGlobal)
  countGlobal = parseInt(countGlobal)

  await getResponseSync('https://kitsu.io/api/edge/anime?page[limit]=20&page[offset]=' + countGlobal +
    '&filter[seasonYear]=' + animeYear).then(
    async function (body) {
      console.log('Response:', body);

      var animeResponseArray = JSON.parse(body).data;

      for (let i = 0; i < animeResponseArray.length; i++) {
        var animeEntry = {}
        try {
          const animeID = animeResponseArray[i].id
          const animeRef = await animeEntriesCollection.where('id', '==', animeID).get();

          if (animeRef.empty) {
            animeEntry = await parseOneAnime(animeResponseArray[i]);
            const docRef = animeEntriesCollection.doc();

            await docRef.set(animeEntry);

            countGlobal++;
            console.log("\n========== COUNT: %d    ============\n", countGlobal);
          } else {
            console.log("Anime already in database")
          }


        } catch (e) {
          console.log(e)
          break //abort the reading operation
        }

      }

      fs.writeFileSync(animeCountPath, countGlobal.toString());


    }
  )

  return countGlobal

}


var countAnimeFinal = 0
var lastValue = 0
while (true) {
  countAnimeFinal = await readNextAnimeIntoDb()
  if (countAnimeFinal == lastValue) {
    break
  }
  lastValue = countAnimeFinal
}