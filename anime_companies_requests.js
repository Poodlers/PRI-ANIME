import request from 'request';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('anime-database-pri-firebase-adminsdk-tqtzj-ea69f4853d.json', 'utf8'));


initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const anime_companiesCollection = db.collection('anime_companies_studios')


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


async function parseOneProducer(producerResponse){
  
  var producerEntry = {}

  producerEntry["id"] = producerResponse.id
  const producerAttributes = producerResponse.attributes

  producerEntry["created_at"] = producerAttributes.createdAt

  producerEntry["name"] = producerAttributes.name

  return producerEntry

} 



async function readNextProducerIntoDb(){
  var countGlobal = fs.readFileSync("producers_count.txt", {encoding:'utf8', flag:'r'});
  console.log(countGlobal)
  countGlobal = parseInt(countGlobal)

  await getResponseSync('https://kitsu.io/api/edge/producers?page[limit]=20&page[offset]=' + countGlobal).then(
    async function (body){
      console.log('Response:', body);
      var producerResponseArray = JSON.parse(body).data;
    
      for(let i = 0; i < producerResponseArray.length; i++){
        var producerEntry = {}
        try{
          const producerID = producerResponseArray[i].id
          const producerRef = await anime_companiesCollection.where('id', '==', producerID).get();
    
          if(producerRef.empty){
            producerEntry = await parseOneProducer(producerResponseArray[i]);
            const docRef = anime_companiesCollection.doc();
    
            await docRef.set(producerEntry);
            
            countGlobal++;
            console.log("\n========== COUNT producers: %d    ============\n", countGlobal );
          }else{
            console.log("Company already registered in database! ")
          }
    
        }catch(e){
          console.log(e)
          break  //abort the reading operation
        }
        
      }
    
      fs.writeFileSync("producers_count.txt", countGlobal.toString());
    
    }
  )
  
  return countGlobal
}


var countCompanyFinal = 0
var lastValue = 0
while(true){
  countCompanyFinal = await readNextProducerIntoDb()

  if(countCompanyFinal == lastValue){
    break
  }
  lastValue = countCompanyFinal
}
