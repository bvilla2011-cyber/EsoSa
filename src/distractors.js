import { LEXIC } from './banc.js';
// Distractors selected by meaning, never by random sampling across unrelated topics.
// Keep the canonical answer unchanged so saved mastery IDs remain valid.
const PROPERS={
  "ensorrar-se": [
    "esquerdar-se",
    "abonyegar-se",
    "entelar-se"
  ],
  "abonyegar-se": [
    "esquerdar-se",
    "rovellar",
    "entelar-se"
  ],
  "esclatar": [
    "esquerdar-se",
    "fondre's",
    "ensorrar-se"
  ],
  "esquerdar-se": [
    "abonyegar-se",
    "esclatar",
    "rovellar"
  ],
  "estimbar-se": [
    "rodolar",
    "encallar-se",
    "sacsejar"
  ],
  "encallar-se": [
    "rutllar",
    "engegar",
    "desmuntar-se"
  ],
  "entelar-se": [
    "rovellar",
    "esquerdar-se",
    "fondre's"
  ],
  "rodolar": [
    "sacsejar",
    "estimbar-se",
    "tibar"
  ],
  "rutllar": [
    "engegar",
    "encallar-se",
    "desmuntar-se"
  ],
  "desmanegar-se": [
    "encallar-se",
    "abonyegar-se",
    "esquerdar-se"
  ],
  "fondre's": [
    "esclatar",
    "rovellar",
    "entelar-se"
  ],
  "engegar": [
    "rutllar",
    "encallar-se",
    "desmuntar-se"
  ],
  "exhaurir-se": [
    "encallar-se",
    "fondre's",
    "rovellar"
  ],
  "caure": [
    "rodolar",
    "sacsejar",
    "encallar-se"
  ],
  "desmuntar-se": [
    "esquerdar-se",
    "abonyegar-se",
    "rovellar"
  ],
  "rovellar": [
    "entelar-se",
    "fondre's",
    "abonyegar-se"
  ],
  "renegar": [
    "remugar",
    "rondinar",
    "aconsellar"
  ],
  "remugar": [
    "renegar",
    "escridassar",
    "aconsellar"
  ],
  "escridassar": [
    "remugar",
    "pidolar",
    "aconsellar"
  ],
  "fer un volt": [
    "rodolar",
    "traginar",
    "aferrar-se"
  ],
  "enllestir": [
    "engegar",
    "copsar",
    "acostumar-se"
  ],
  "acostumar-se": [
    "aferrar-se",
    "embrancar-se",
    "adreçar-se"
  ],
  "plegar": [
    "engegar",
    "copsar",
    "mesurar"
  ],
  "pidolar": [
    "aconsellar",
    "escridassar",
    "remugar"
  ],
  "rondinar": [
    "renegar",
    "escridassar",
    "pidolar"
  ],
  "apuntalar": [
    "tibar",
    "cargolar",
    "aferrar-se"
  ],
  "enriolar-se": [
    "rondinar",
    "remugar",
    "acostumar-se"
  ],
  "aferrar-se": [
    "engrapar",
    "tibar",
    "apuntalar"
  ],
  "adreçar-se": [
    "aconsellar",
    "escridassar",
    "pidolar"
  ],
  "embrancar-se": [
    "acostumar-se",
    "aferrar-se",
    "adreçar-se"
  ],
  "sacsejar": [
    "espolsar",
    "rodolar",
    "tibar"
  ],
  "aconsellar": [
    "adreçar-se",
    "escridassar",
    "remugar"
  ],
  "engaitar": [
    "remugar",
    "rondinar",
    "renegar"
  ],
  "engrapar": [
    "tibar",
    "traginar",
    "carregar"
  ],
  "copsar": [
    "aconsellar",
    "mesurar",
    "enllestir"
  ],
  "escampar": [
    "abocar",
    "espolsar",
    "traginar"
  ],
  "bufar": [
    "espolsar",
    "sacsejar",
    "tibar"
  ],
  "me n'alegro": [
    "tant de bo!",
    "no me'n sé avenir",
    "què hi farem!"
  ],
  "sí, ves!": [
    "tant si vols com si no vols",
    "ves si no!",
    "tant se val"
  ],
  "no hi ha res a fer": [
    "tant se val",
    "tant de bo!",
    "va com va"
  ],
  "què vols fer-hi!": [
    "tant de bo!",
    "ves si no!",
    "no me'n sé avenir"
  ],
  "no me'n sé avenir": [
    "tant de bo!",
    "n'estic tip",
    "tant se val"
  ],
  "què hi farem!": [
    "ves si no!",
    "tant de bo!",
    "tornem-hi"
  ],
  "tant se val": [
    "què hi farem!",
    "va com va",
    "tant de bo!"
  ],
  "va com va": [
    "tant se val",
    "no hi ha res a fer",
    "tant si vols com si no vols"
  ],
  "n'estic tip": [
    "no me'n sé avenir",
    "tant se val",
    "tant de bo!"
  ],
  "n'estic fart": [
    "què hi farem!",
    "m'és igual",
    "no me'n sé avenir"
  ],
  "m'és igual": [
    "què hi farem!",
    "n'estic tip",
    "tant de bo!"
  ],
  "tant me fa": [
    "què hi farem!",
    "n'estic tip",
    "tant de bo!"
  ],
  "ves si no!": [
    "sí, ves!",
    "tant si vols com si no vols",
    "què hi farem!"
  ],
  "això rai!": [
    "què hi farem!",
    "no me'n sé avenir",
    "tant de bo!"
  ],
  "tornem-hi": [
    "va com va",
    "tant de bo!",
    "no hi ha res a fer"
  ],
  "tant se me'n dóna": [
    "què hi farem!",
    "n'estic tip",
    "tant de bo!"
  ],
  "tant de bo!": [
    "me n'alegro",
    "què hi farem!",
    "no me'n sé avenir"
  ],
  "tant si vols com si no vols": [
    "sí, ves!",
    "va com va",
    "tant se val"
  ],
  "qui ho havia de dir!": [
    "tant de bo!",
    "què hi farem!",
    "ves si no!"
  ],
  "no hi fa res": [
    "què hi farem!",
    "no me'n sé avenir",
    "tant de bo!"
  ],
  "cargolar": [
    "doblegar",
    "tibar",
    "apuntalar"
  ],
  "engruixir": [
    "eixamplar",
    "allargar",
    "atapeir"
  ],
  "aplanar": [
    "aprimar",
    "eixamplar",
    "arrodonir"
  ],
  "eixamplar": [
    "engruixir",
    "allargar",
    "aplanar"
  ],
  "abaixar": [
    "apujar",
    "escurçar",
    "aprimar"
  ],
  "aprimar": [
    "escurçar",
    "estrènyer",
    "aplanar"
  ],
  "doblegar": [
    "cargolar",
    "embolicar",
    "arrodonir"
  ],
  "mesurar": [
    "escurçar",
    "allargar",
    "arrodonir"
  ],
  "tallar": [
    "foradar",
    "doblegar",
    "dissoldre"
  ],
  "entaforar": [
    "carregar",
    "abocar",
    "embolicar"
  ],
  "enfonsar": [
    "buidar",
    "foradar",
    "aplanar"
  ],
  "foradar": [
    "tallar",
    "esquerdar-se",
    "abonyegar-se"
  ],
  "escurçar": [
    "aprimar",
    "abaixar",
    "estrènyer"
  ],
  "folrar": [
    "embolicar",
    "entaforar",
    "atapeir"
  ],
  "apujar": [
    "allargar",
    "engruixir",
    "abaixar"
  ],
  "atapeir": [
    "engruixir",
    "embolicar",
    "folrar"
  ],
  "carregar": [
    "traginar",
    "abocar",
    "entaforar"
  ],
  "arrodonir": [
    "aplanar",
    "eixamplar",
    "allargar"
  ],
  "fer servir": [
    "engegar",
    "rutllar",
    "enllestir"
  ],
  "tibar": [
    "sacsejar",
    "doblegar",
    "cargolar"
  ],
  "traginar": [
    "carregar",
    "abocar",
    "entaforar"
  ],
  "espolsar": [
    "sacsejar",
    "bufar",
    "buidar"
  ],
  "embolicar": [
    "entaforar",
    "atapeir",
    "cargolar"
  ],
  "abocar": [
    "buidar",
    "carregar",
    "escampar"
  ],
  "allargar": [
    "eixamplar",
    "engruixir",
    "apujar"
  ],
  "estrènyer": [
    "escurçar",
    "abaixar",
    "aplanar"
  ],
  "dissoldre": [
    "tallar",
    "foradar",
    "esquerdar-se"
  ],
  "buidar": [
    "carregar",
    "atapeir",
    "entaforar"
  ]
};
const DITES_ERRORS={
  "matar dos pardals d'un tret": [
    "Haver de triar entre dos objectius incompatibles.",
    "Repetir una mateixa acció per assegurar-ne el resultat.",
    "Perdre dues oportunitats per actuar massa de pressa."
  ],
  "m'importa un rave": [
    "Em molesta, encara que no vulgui reconèixer-ho.",
    "M’interessa, però prefereixo no intervenir-hi.",
    "Em preocupa menys que abans, però encara hi penso."
  ],
  "ni de bon tros": [
    "Només en una petita part.",
    "Gairebé del tot, però encara no completament.",
    "Només si es compleixen certes condicions."
  ],
  "ni fred ni calor": [
    "No saber quina de dues opcions escollir.",
    "Amagar el disgust per evitar una discussió.",
    "Tenir sentiments oposats envers una situació."
  ],
  "no badar boca": [
    "Parlar sense pensar en les conseqüències.",
    "No escoltar el que diu una altra persona.",
    "No explicar tota la veritat sobre un fet."
  ],
  "no estar per orgues": [
    "No entendre les bromes dels altres.",
    "No tenir temps per acabar una feina.",
    "No voler canviar d’opinió en una discussió."
  ],
  "no fotre ni brot": [
    "Fer una feina lentament i amb poc resultat.",
    "Començar moltes feines i deixar-les a mitges.",
    "Fer només la part més fàcil d’una feina."
  ],
  "no venir a tomb": [
    "Arribar en el moment previst.",
    "No arribar a un acord amb algú.",
    "No entendre el sentit d’una explicació."
  ],
  "passar de taca d'oli": [
    "Escampar-se una notícia entre molta gent.",
    "Deixar una mala impressió difícil d’oblidar.",
    "Fer créixer un problema sense adonar-se’n."
  ],
  "passar la nit del lloro": [
    "Passar la nit parlant sense parar.",
    "Passar la nit fora de casa per diversió.",
    "Passar la nit treballant amb bons resultats."
  ]
};
const CONTRASTOS={
  "aferrar-se": [
    "Agafar una cosa amb suavitat i deixar-la de seguida.",
    "Fer relliscar una cosa entre les mans.",
    "Mantenir una cosa en equilibri sense tocar-la."
  ],
  "sacsejar": [
    "Fer girar una cosa contínuament en el mateix sentit.",
    "Estirar una cosa fins que quedi tibant.",
    "Fer lliscar una cosa suaument en línia recta."
  ],
  "adreçar-se": [
    "Escoltar atentament les paraules d’algú.",
    "Repetir per escrit les paraules d’algú.",
    "Evitar parlar amb una persona concreta."
  ],
  "abocar": [
    "Extreure un líquid fent-lo passar per un filtre.",
    "Fer entrar un líquid dins un material absorbent.",
    "Barrejar el contingut sense canviar-lo de recipient."
  ],
  "buidar": [
    "Fer lloc en un recipient comprimint-ne el contingut.",
    "Tapar un recipient perquè no en surti el contingut.",
    "Canviar de lloc un recipient sense treure’n res."
  ],
  "folrar": [
    "Embolicar una cosa només per transportar-la.",
    "Unir dues peces cosint-ne les vores.",
    "Omplir una peça amb material per donar-li volum."
  ]
};
const definicions=new Map(LEXIC);
export function opcionsDificils(mode,mot,correcta){
 const errors=mode==='dites'?DITES_ERRORS[mot]:(CONTRASTOS[mot]||PROPERS[mot]?.map(m=>definicions.get(m)));
 if(!errors||errors.length!==3||errors.some(x=>!x||x===correcta)||new Set(errors).size!==3)
   throw Error('Distractors incomplets: '+mot);
 return [correcta,...errors];
}
