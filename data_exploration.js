import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('anime-database-pri-firebase-adminsdk-tqtzj-ea69f4853d.json', 'utf8'));


initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const animeCollection = db.collection('anime_entries')
const charactersCollection = db.collection('anime_characters')


const animeRef = await animeCollection.get();
const characterRef = await charactersCollection.get()
const animeNum = animeRef.size
const characterNum = characterRef.size

console.log("Total anime: ", animeNum)
console.log("Total characters: ", characterNum)
console.log("Number of character per anime: " , characterNum / animeNum)



