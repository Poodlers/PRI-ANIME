import request from 'request';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('anime-database-pri-firebase-adminsdk-tqtzj-ea69f4853d.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function parseOneProducer(producerResponse){
  
  var producerEntry = {}

  producerEntry["id"] = producerResponse.id
  const producerAttributes = producerResponse.attributes

  producerEntry["created_at"] = producerAttributes.createdAt

  producerEntry["name"] = producerAttributes.name

  return producerEntry

} 


function readNextProducerIntoDb(){
  var countGlobal = fs.readFileSync("producers_count.txt", {encoding:'utf8', flag:'r'});
  console.log(countGlobal)

  request('https://kitsu.io/api/edge/producers?page[limit]=20&page[offset]=' + countGlobal ,async function (error, response, body){
  console.log('Response:', body);

  var producerResponseArray = JSON.parse(body).data;
  var count = parseInt(countGlobal)

  for(let i = 0; i < producerResponseArray.length; i++){
    var animeEntry = {}
    try{
      animeEntry = await parseOneProducer(producerResponseArray[i]);
      const docRef = db.collection('anime_companies_studios').doc();

      await docRef.set(animeEntry);
      
      count++;
      console.log("\n========== COUNT producers: %d    ============\n", count );


    }catch(e){
      console.log(e)
      break  //abort the reading operation
    }
    
  }

  fs.writeFileSync("producers_count.txt", count.toString());


})

}


readNextProducerIntoDb()