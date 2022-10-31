import { time } from 'console';
import { scaleDivergingPow } from 'd3';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import request from 'request';

const serviceAccount = JSON.parse(fs.readFileSync('anime-database-pri-firebase-adminsdk-tqtzj-ea69f4853d.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const db = getFirestore();

const animeCollection = db.collection('anime_entries')
const charactersCollection = db.collection('anime_characters')
const anime_VA_charaCollection = db.collection('anime_VA_chara_relationship')
const VACollection = db.collection('anime_voice_actors')
const staffCollection = db.collection('anime_staff')
const anime_mediaCollection = db.collection('anime_media_relationships')
const anime_reviewsCollection = db.collection('anime_reviews')
const anime_productions_relationsCollection = db.collection('production_relationships')

function getResponseSync(url){
    return new Promise((resolve, reject) => {
      request(url, (error, response, body) => {
          if (error) console.log("Error: ", error);
          if(response == undefined){
            delay(500);
            return getResponseSync(url);
          }
          else if (response.statusCode != 200) {
              reject('Invalid status code <' + response.statusCode + '>');
          }else{
            resolve(body);
          }
          
      });
  });
  }

async function makePersonVARequest(request_body, characterID, language){
    var personResponse = JSON.parse(request_body).data;
    const personID = personResponse.id
    const personAttributes = personResponse.attributes
    const peopleRef = await VACollection.where('id', '==', personID).get();
    if (peopleRef.empty) {
        const newPerson = VACollection.doc()
        var personEntry = {"id": personID }
        personEntry["name"] = personAttributes.name
        personEntry["description"] = personAttributes.description
        if(personAttributes.image != undefined){
            personEntry["portrait"] = personAttributes.image.original
        }
        

        await newPerson.set(personEntry);

        console.log("added VA with ID: ", personID)

    }

    const new_VA_chara_relation = anime_VA_charaCollection.doc()
    new_VA_chara_relation.set({"VAId" : personID, "charID": characterID, "lang": language})




}

async function makeVARequest(request_body, characterID){
    var castingsResponse = JSON.parse(request_body).data;

    //add to VA table 
    //add to the anime_VA_chara_relationship

    for(let i = 0; i < castingsResponse.length; i++){
        const VACastingID = castingsResponse[i].id
        var personRequest =  "https://kitsu.io/api/edge/character-voices/" + VACastingID + "/person" 
        const language = castingsResponse[i].attributes.locale
        await getResponseSync(personRequest).then(
            function(body) {
              makePersonVARequest(body, characterID, language)
            }
          ).catch( () => {
            console.log("Rejected: CASTING  ", VACastingID)
          })

       
    }   
}

async function makeCharacterInfoRequest(request_body, animeEntry, animeID){
    var charResponse = JSON.parse(request_body).data;
    const charAttributes = charResponse.attributes

    const charNames = charAttributes.names
    for (const [key, value] of Object.entries(charNames)) {
        animeEntry["name_" + key] = value
    }
    animeEntry["canonical_name"] = charAttributes.canonicalName
    animeEntry["other_names"] = charAttributes.otherNames

    animeEntry["description"] = charAttributes.description
    animeEntry["appears_on"] = [animeID]

    if(charAttributes.image != undefined){
        animeEntry["char_image"] = charAttributes.image.original
    }
    
    var VARequest = "https://kitsu.io/api/edge/media-characters/" + animeEntry.id + "/voices?page[limit]=20"
     
    await getResponseSync(VARequest).then(
        function(body) {
          makeVARequest(body, animeEntry.id)
        }
      ).catch( () => {
        console.log("Rejected: VOICE ACTORS  ", charAttributes.canonicalName)
      })



}


async function makeCharacterRequests(charactersArray, animeID){
    for(let i = 0; i < charactersArray.length; i++){
        const charObjId = charactersArray[i].id
        //check if this ID already exists in the characters TABLE
        const character = await charactersCollection.where('id', '==', charObjId).get();
        if (character.empty) {
            const newChara = charactersCollection.doc()
            var characterEntry = {"id": charObjId}
            var character_request = "https://kitsu.io/api/edge/media-characters/" + charObjId +"/character"
            await getResponseSync(character_request).then(
                function(body) {
                  makeCharacterInfoRequest(body, characterEntry, animeID)
                }
              ).catch( () => {
                console.log("Rejected: character  ", charObjId)
              })
    
            await newChara.set(characterEntry);
            console.log("Added new character ID: ", charObjId )
        }else{
            character.forEach(doc => {
                const characterDoc = charactersCollection.doc(doc.id)
                var characterObj = doc.data()

                var char_appearsOn = characterObj["appears_on"]
                if(char_appearsOn == undefined){
                    char_appearsOn = []
                }

                char_appearsOn.push(animeID)
                characterObj["appears_on"] = char_appearsOn

                characterDoc.set(characterObj)

            })
        }
    }
}

async function makePersonStaffRequest(request_body){
    var personResponse = JSON.parse(request_body).data;
    try{
        const personID = personResponse.id
        const personAttributes = personResponse.attributes
        const peopleRef = await staffCollection.where('id', '==', personID).get();
        if (peopleRef.empty) {
            const newPerson = staffCollection.doc()
            var personEntry = {"id": personID }
            personEntry["name"] = personAttributes.name
            personEntry["description"] = personAttributes.description
            if(personAttributes.image != undefined){
                personEntry["portrait"] = personAttributes.image.original
            }
            

            await newPerson.set(personEntry);

            console.log("added STAFF with ID: ", personID)

        }
    }catch(e){
        console.log(e)
    }
    

}

async function makeStaffRequests(staffRelationships){
    for(let i = 0; i < staffRelationships.length; i++){
        const media_staff_id = staffRelationships[i].id
        var personRequest =  "https://kitsu.io/api/edge/media-staff/" + media_staff_id +  "/person"
        await getResponseSync(personRequest).then(
            function(body){
                makePersonStaffRequest(body)
            }
        ).catch( (reason) => {
            console.log("reason: ", reason)
            console.log("Rejected: STAFF  ", media_staff_id)
          })


         
    }
}

async function makeMediaRelationRequest(request_body , relationShipID,  role, sourceID){
    var relationResponse = JSON.parse(request_body).data;
    try{
        const relationRef = await anime_mediaCollection.where('id', '==', relationShipID).get();
        if (relationRef.empty) {
            const newRelation = anime_mediaCollection.doc()
            var relationEntry = {"id": relationShipID }
            relationEntry["role"] = role
            relationEntry["sourceID"] = sourceID
            relationEntry["destinationInfo"] = {"type" : relationResponse.type , "idDest": relationResponse.id }

            await newRelation.set(relationEntry);

            console.log("added media relation with ID: ", relationShipID)
        } 
    }catch(e){
        console.log(e)
    }
    
}

async function makeMediaRequests(mediaRelationships, animeID){
    for(let i = 0; i < mediaRelationships.length; i++){
        const media_relationships_id = mediaRelationships[i].id
        const media_relationship_type = mediaRelationships[i].role
        var destRequest =  "https://kitsu.io/api/edge/media-relationships/" + media_relationships_id + "/relationships/destination"
        await getResponseSync(destRequest).then(
            function(body){
                makeMediaRelationRequest(body, media_relationships_id, media_relationship_type, animeID)
            }
        ).catch( (reason) => {
            console.log("reason: " , reason)
            console.log("Rejected: MEDIA RELATIONSHIP  ", media_relationships_id)
          })


         
    }
}

async function makeIndividualReviewReq(request_body, animeID, reviewID){
    var reviewResponse = JSON.parse(request_body).data;
    const reviewAttributes = reviewResponse.attributes
    var reviewObj = {"id" : reviewID, "animeID": animeID}
    const newReview = anime_reviewsCollection.doc()

    reviewObj["created_at"] = reviewAttributes.createdAt
    reviewObj["last_updated_at"] = reviewAttributes.updatedAt

    reviewObj["content"] = reviewAttributes.contentFormatted
    reviewObj["likes_count"] = reviewAttributes.likesCount

    reviewObj["rating"] = reviewAttributes.rating

    reviewObj["spoiler"] = reviewAttributes.spoiler

    await newReview.set(reviewObj);
    console.log("added review with ID: ", reviewID)

}


async function makeReviewsRequests(reviews, animeID){
    for(let i = 0; i < reviews.length; i++){
        const reviewID = reviews[i].id
        const reviewRef = await anime_reviewsCollection.where('id', '==', reviewID).get();
        if (reviewRef.empty) {
            var reviewRequest =  "https://kitsu.io/api/edge/reviews/" + reviewID
            await getResponseSync(reviewRequest).then(
                function(body){
                    makeIndividualReviewReq(body, animeID, reviewID)
                }
            ).catch( (reason) => {
                console.log("Rejected: REVIEW  ", reviewID)
              })
    
        }
    }
}

async function makeIndividualProductionRelationRequest(request_body, animeID, productionID, relationType){
    var companyResponse = JSON.parse(request_body).data;
    const companyAttributes = companyResponse.attributes
    var productionObj = {"id" : productionID, "animeID" : animeID, "role": relationType}
    const newProduction = anime_productions_relationsCollection.doc()

    productionObj["companyID"] = companyResponse.id 

    await newProduction.set(productionObj);
    console.log("added production_relation with ID: ", productionID)
}

async function makeProductionRelationShipRequests(production_relationships, animeID){
    for(let i= 0; i< production_relationships.length; i++){
        const production_relationshipsID = production_relationships[i].id
        const relationType = production_relationships[i].role
        const productionRef = await anime_productions_relationsCollection.where('id', '==', production_relationshipsID).get();
        if(productionRef.empty){
            var companyRequest = "https://kitsu.io/api/edge/media-productions/" + production_relationshipsID + "/company" 
           await getResponseSync(companyRequest).then(
                function(body){
                    makeIndividualProductionRelationRequest(body, animeID, production_relationshipsID, relationType)
                }
            ).catch( () => {
                console.log("Rejected: PRODUCTION RELATIONSHIP  ", production_relationshipsID)
              })
    
        }

    }

}   

const animeYear = process.argv[2];
const animeRef = await animeCollection.where('year', '==', animeYear).get();

if (animeRef.empty) {
  console.log('No matching documents.');
  
}

var count = 0

animeRef.forEach( async doc =>{
    const docObj = doc.data()
    //fill the characters table first
    var charactersArr = docObj.characters
    if(charactersArr != undefined){
       await makeCharacterRequests(charactersArr, docObj.id)
    }

    //fill the anime-staff relationships

    var staffRelationships = docObj.staff

    if(staffRelationships != undefined){
        await makeStaffRequests(staffRelationships)
    }

    //fill the media-relationship relationships
    var mediaRelationships = docObj.media_relationships
    if(mediaRelationships != undefined){
       await makeMediaRequests(mediaRelationships, docObj.id)
    }

    //fill the production relationships
    var production_relationships = docObj.production_relationships
    if(production_relationships != undefined){
       await makeProductionRelationShipRequests(production_relationships, docObj.id)
    }

    // fill the review relationships
    var reviews = docObj.reviews
    if(reviews != undefined){
        await makeReviewsRequests(reviews, docObj.id)
    }
    count++;
    delay(500);
    console.log("====== Parsed anime #", count)

} ) 