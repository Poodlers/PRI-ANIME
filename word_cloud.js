import * as fs from 'fs';
import { Canvas } from 'canvas'
import cloud from 'd3-cloud'
import * as d3 from "d3"
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(fs.readFileSync('anime-database-pri-firebase-adminsdk-tqtzj-ea69f4853d.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();


const animeCollection = db.collection('anime_entries')

const animeRef = await animeCollection.get();

var synopsisWords = []

const stopWords = [ "_", "1","2","3", "4","5","6","7","8","9", "10",
    "a","a's","able","about","above","according","accordingly","across","actually",
    "after","afterwards","again","against","ain't","all","allow","allows",
    "almost","alone","along","already","also","although","always","am","among",
    "amongst","an","and","another","any","anybody","anyhow","anyone","anything","",
    "anyway","anyways","anywhere","apart","appear","appreciate","appropriate","are","aren't", "but", "them", "she", "he","t","l", "ni",
    "around","as","aside","ask","asking","associated","at","available","away","awfully","b","be","became",
    "because","become","becomes","becoming","been","before","beforehand","behind","being","believe","below",
    "beside","besides","best","better","between","beyond","both","brief","but","by","c","c'mon","c's","came",
    "can","can't","cannot","cant","cause","causes","certain","certainly","changes","clearly","co","com","come",
    "comes","concerning","consequently","consider","considering","contain","containing","contains","corresponding",
    "could","couldn't","course","currently","d","definitely","described","despite","did","didn't","different","do","does","doesn't","doing",
    "don't","done","down","downwards","during","e","each","edu","eg","eight","either","else","elsewhere","enough","entirely","especially","et",
    "etc","even","ever","every","everybody","everyone","everything","everywhere","ex","exactly","example","except","f","far","few","fifth",
    "first","five","followed","following","follows","for","former","formerly","forth","four","from","further","furthermore","g","get","gets",
    "getting","given","gives","go","goes","going","gone","got","gotten","greetings","h","had","hadn't","happens","hardly","has","hasn't",
    "have","haven't","having","he","he's","hello","help","hence","her","here","here's","hereafter","hereby","herein","hereupon","hers",
    "herself","hi","him","himself","his","hither","hopefully","how","howbeit","however","i","i'd","i'll","i'm","i've","in", "ie","if","ignored",
    "immediate","in","inasmuch","inc","indeed","indicate","indicated","indicates","inner","insofar","instead","into","inward","is","isn't",
    "it","it'd","it'll","it's","its","itself","j","just","k","keep","keeps","kept","know","known","knows","l","last","lately","later"
    ,"latter","latterly","least","less","lest","let","let's","like","liked","likely","little","look",
    "looking","looks","ltd","m","mainly","many","may","maybe","me","mean","meanwhile","merely","might","more",
    "moreover","most","mostly","much","must","my","myself","n","name","namely","nd","near","nearly","necessary","need",
    "needs","neither","never","nevertheless","new","next","nine","no","nobody","non","none","noone","nor","normally","not",
    "nothing","novel","now","nowhere","o","obviously","of","off","often","oh","ok","okay","old","on","once","one","ones","only",
    "onto","or","other","others","otherwise","ought","our","ours","ourselves","out","outside","over","overall","own","p","particular",
    "particularly","per","perhaps","placed","please","plus","possible","presumably","probably","provides","q","que","quite","qv","r",
    "rather","rd","re","really","reasonably","regarding","regardless","regards","relatively","respectively","right","s","said","same",
    "saw","say","saying","says","second","secondly","see","seeing","seem","seemed","seeming","seems","seen","self","selves","sensible",
    "sent","serious","seriously","seven","several","shall","she","should","shouldn't","since","six","so","some","somebody","somehow","someone",
    "something","sometime","sometimes","somewhat","somewhere","soon","sorry","specified","specify","specifying","still","sub","such","sup",
    "sure","t","t's","take","taken","tell","tends","th","than","thank","thanks","thanx","that","that's","thats","the","their","theirs","them",
    "themselves","then","thence","there","there's","thereafter","thereby","therefore","therein","theres","thereupon","these","they","they'd",
    "they'll","they're","they've","think","third","this","thorough","thoroughly","those","though","three","through","throughout","thru","thus",
    "to","together","too","took","toward","towards","tried","tries","truly","try","trying","twice","two","u","un","under","unfortunately","unless",
    "unlikely","until","unto","up","upon","us","use","used","useful","uses","using","usually","uucp","v","value","various","very","via","viz",
    "vs","w","want","wants","was","wasn't","way","we","we'd","we'll","we're","we've","welcome","well","went","were","weren't","what","what's",
    "whatever","when","whence","whenever","where","where's","whereafter","whereas","whereby","wherein","whereupon","wherever","whether","which",
    "while","whither","who","who's","whoever","whole","whom","whose","why","will","willing","wish","with","within","without","won't","wonder",
    "would","wouldn't","x","y","yes","yet","you","you'd","you'll","you're","you've","your","yours","yourself","yourselves","z","zero"]


function wordFrequency(txt){
    var wordArray = txt.split(/[ .?!,:*'"\n)(]/);
    var newArray = [], wordObj;
    wordArray.forEach(function (word) {
      wordObj = newArray.filter(function (w){
        return w.text.toLowerCase() == word.toLowerCase();
      });
      if (wordObj.length) {
        wordObj[0].size += 1;
      } else {
        newArray.push({text: word, size: 1});
      }
    });
    return newArray;
}


animeRef.forEach( doc => {
    const aniemObj = doc.data()
    var synopsis = aniemObj.synopsis
    if(synopsis != null && synopsis != undefined){
        var countArray = wordFrequency(synopsis)
        for(let i = 0; i < countArray.length; i++){
            const text = countArray[i].text
            const size = countArray[i].size
            const synopsisIndex = synopsisWords.findIndex((element) => element.text == text)
            if(synopsisIndex == -1){
                synopsisWords.push(countArray[i])
            }else{
                synopsisWords[synopsisIndex] = {text: text, size: synopsisWords[synopsisIndex].size + size  }
            }
        }
    }
    
})



synopsisWords = synopsisWords.filter((el) => stopWords.findIndex((element) =>  element.toLowerCase() == el.text.toLowerCase()) == -1 )
synopsisWords.sort((a, b) => b.size - a.size)
synopsisWords = synopsisWords.slice(0, 200)
console.log(synopsisWords)


const colors = ["#FF0000", "#FFFF00", "#00994C", "#000000", "#FFFF00", "#0000CC", "#CC6600", "#CC99FF", "#009999"]
 
cloud().size([709, 369])
  .canvas(function() {
    return new Canvas(1, 1)
  })
  .words(synopsisWords)
  .padding(5)
  .rotate(function () {
    return ~~(Math.random() * 2) * 90;
  })
  .font("Impact")
  .fontSize(function (d) {
    return d.size;
  })
  .on("end", draw)
  .start()


function draw(words, bounds) {
  const { x: width, y: height } = bounds[1]
  
  const canvas = new Canvas(width, height, 'png')
  const ctx = canvas.getContext('2d')
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  var colorCount = 0
  for (let word of words) {
    ctx.font = `${word.size * 1.2}px ${word.font}`
    ctx.fillStyle = colors[colorCount]
    colorCount = (colorCount + 1) % colors.length
    ctx.fillText(word.text, (width / 2) + word.x , (height / 2) + word.y )
  }
  

  fs.writeFileSync('out.png', canvas.toBuffer())
  
}
