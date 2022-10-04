import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import request from 'request';

const serviceAccount = JSON.parse(fs.readFileSync('anime-database-pri-firebase-adminsdk-tqtzj-ea69f4853d.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const animeCollection = db.collection('anime_entries')
const charactersCollection = db.collection('anime_characters')
const anime_VA_charaCollection = db.collection('anime_VA_chara_relationship')
const VACollection = db.collection('anime_voice_actors')


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
          ) 

       
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
      ) 


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
              ) 
            await newChara.set(characterEntry);
            console.log("Added new character ID: ", charObjId )
        }else{
            character.forEach(doc => {
                const characterDoc = charactersCollection.doc(doc.id)
                var characterObj = doc.data()

                var char_appearsOn = characterObj.appears_on

                char_appearsOn.push(animeID)
                characterObj.appears_on = char_appearsOn

                characterDoc.set(characterObj)

            })
        }
    }
}


const animeRef = await animeCollection.where('id', '==', "1").get();
if (animeRef.empty) {
  console.log('No matching documents.');
  
}

animeRef.forEach( doc => {
    const docObj = doc.data()
    //fill the characters table first
    var charactersArr = docObj.characters
    if(charactersArr != undefined){
        makeCharacterRequests(charactersArr, docObj.id)
    }

    //fill the anime-staff relationships

    //fill the media-relationship relationships

    // fill the review relationships

} )