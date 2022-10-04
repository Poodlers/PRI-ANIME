import request from 'request';


import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('anime-database-pri-firebase-adminsdk-tqtzj-ea69f4853d.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

function getResponseSync(url){
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


function requestAnimeAttributes(request_body, animeEntry, attName, relevantAttributes){
    var genreResponse = JSON.parse(request_body).data;
    var genreArray = []

    for(let i = 0; i < genreResponse.length; i++){
      var attributes = genreResponse[i].attributes
      var attObj = {id: genreResponse[i].id}
      for(let j = 0; j < relevantAttributes.length; j++){

        attObj[relevantAttributes[j]] = attributes[relevantAttributes[j]]

      }

      genreArray.push(attObj)
    }

    animeEntry[attName] = genreArray

}

async function parseOneAnime(animeResponse){
  
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

  animeEntry["end_date"] = animeAttributes.endDate

  animeEntry["popularity_ranking"] = animeAttributes.popularityRank

  animeEntry["rating_ranking"] = animeAttributes.ratingRank

  animeEntry["age_rating"] = animeAttributes.ageRating

  animeEntry["age_rating_guide"] = animeAttributes.ageRatingGuide

  animeEntry["subtype"] = animeAttributes.subtype

  animeEntry["status"] = animeAttributes.status

  if(animeAttributes.posterImage != undefined){
    animeEntry["original_poster"] = animeAttributes.posterImage.original
  }
   

  if(animeAttributes.coverImage != undefined){
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
    function(body) {
      requestAnimeAttributes(body, animeEntry,"genre", ["name"])
    }
  ) 
  
  var categories_request = relationships.categories.links.related

  await getResponseSync(categories_request).then(

    function(body){
      requestAnimeAttributes(body, animeEntry, "categories" ,["title"])
    }
  )

  var reviews_request = relationships.reviews.links.related

  await getResponseSync(reviews_request).then(
    function(body){
      requestAnimeAttributes(body, animeEntry, "reviews", [] )
    }
  )
 
  var characters_request = relationships.characters.links.related

  await getResponseSync(characters_request).then(
    function(body){
      requestAnimeAttributes(body, animeEntry, "characters", ["role"])
    }
  )
  
  var staff_request = relationships.staff.links.related
  
  await getResponseSync(staff_request).then(
    function(body){
      requestAnimeAttributes(body, animeEntry, "staff", ["role"])
    }
  )

  var produtcions_request = relationships.productions.links.related

  await getResponseSync(produtcions_request).then(
    function(body){
      requestAnimeAttributes(body, animeEntry, "production_relationships", ["role"])
    }
  )
  
  var mediaRelationships_request = relationships.mediaRelationships.links.related

  await getResponseSync(mediaRelationships_request).then(
    function(body){
      requestAnimeAttributes(body, animeEntry, "media_relationships", ["role"])
    }
  )

  animeEntry["episodes_info"] = "https://kitsu.io/api/edge/anime/" + animeResponse.id + "/episodes"

  return animeEntry;
  

} 


function readNextAnimeIntoDb(){
  var countGlobal = fs.readFileSync("anime2022_count.txt", {encoding:'utf8', flag:'r'});
  console.log(countGlobal)

  request('https://kitsu.io/api/edge/anime?page[limit]=20&page[offset]=' + countGlobal + '&filter[seasonYear]=2022',async function (error, response, body){
  console.log('Response:', body);

  var animeResponseArray = JSON.parse(body).data;
  var count = parseInt(countGlobal)

  for(let i = 0; i < animeResponseArray.length; i++){
    var animeEntry = {}
    try{
      animeEntry = await parseOneAnime(animeResponseArray[i]);
      const docRef = db.collection('anime_entries').doc();

      await docRef.set(animeEntry);
      
      count++;
      console.log("\n========== COUNT: %d    ============\n", count );


    }catch(e){
      console.log(e)
      break  //abort the reading operation
    }
    

  }

  fs.writeFileSync("anime2022_count.txt", count.toString());





})

}


readNextAnimeIntoDb()