// Banc de 50 exemples per al quiz de tipus d’arguments.
// Cada pregunta està pensada perquè hi hagi un tipus principal clar.
export const ARGUMENT_TYPES = [
  {id:'autoritat',label:'Argument d’autoritat',aliases:['autoritat','d’autoritat','argument d’autoritat']},
  {id:'model',label:'Argument del model',aliases:['model','del model','argument del model']},
  {id:'benefici',label:'Argument del benefici',aliases:['benefici','del benefici','argument del benefici']},
  {id:'estalvi',label:'Argument d’estalvi, malbaratament o aprofitament',aliases:['estalvi','malbaratament','aprofitament','argument d’estalvi','argument de malbaratament','argument d’aprofitament']},
  {id:'causa',label:'Argument de causa i conseqüència',aliases:['causa','conseqüència','causa i conseqüència','causa-conseqüència','argument de causa','argument de causa i conseqüència']},
  {id:'exemple',label:'Argument d’exemple',aliases:['exemple','argument d’exemple']},
  {id:'comparacio',label:'Argument de comparació',aliases:['comparació','comparacio','argument de comparació','argument de comparacio']},
  {id:'justicia',label:'Argument de justícia o identificació de situacions',aliases:['justícia','justicia','identificació de situacions','argument de justícia','argument de justicia']},
  {id:'majoria',label:'Argument de quantitat o de majoria',aliases:['majoria','quantitat','argument de majoria','argument de quantitat']},
  {id:'qualitat',label:'Argument de qualitat',aliases:['qualitat','argument de qualitat']},
  {id:'dades',label:'Argument de dades, xifres i estadístiques',aliases:['dades','xifres','estadístiques','estadistiques','argument de dades','argument d’estadístiques']},
  {id:'principi',label:'Argument de principi o valor',aliases:['principi','valor','principi o valor','argument de principi','argument de valor']},
  {id:'dilema',label:'Argument del dilema',aliases:['dilema','argument del dilema']}
];

export const ARGUMENT_QUESTIONS = [
  // Autoritat
  {id:'a1',type:'autoritat',text:'Segons l’Agència de Salut Pública, dormir prou ajuda a mantenir la concentració.',why:'La raó es recolza en una institució especialitzada.'},
  {id:'a2',type:'autoritat',text:'La bibliotecària del centre recomana consultar el catàleg abans de buscar un llibre.',why:'La recomanació prové d’una persona experta en el funcionament de la biblioteca.'},
  {id:'a3',type:'autoritat',text:'D’acord amb l’Institut d’Estudis Catalans, aquesta forma és normativa.',why:'Es cita una institució de referència per justificar la informació.'},
  {id:'a4',type:'autoritat',text:'El pediatre que ens visita a classe explica que el descans és important durant l’adolescència.',why:'La idea es fonamenta en l’opinió d’un professional expert.'},
  // Model
  {id:'m1',type:'model',text:'En Nil prepara la motxilla cada vespre i gairebé mai no oblida el material; podríem imitar aquest hàbit.',why:'Es proposa una conducta concreta com a model per seguir.'},
  {id:'m2',type:'model',text:'La meva cosina va començar a caminar fins a l’institut i ara molts companys fan el mateix.',why:'Una persona i la seva conducta serveixen de model.'},
  {id:'m3',type:'model',text:'L’equip de bàsquet recull el material després d’entrenar; la resta de grups podria seguir-ne l’exemple.',why:'Es presenta una conducta que convé imitar.'},
  {id:'m4',type:'model',text:'La Jana revisa l’agenda abans d’anar a dormir i així organitza millor la setmana; podem adoptar aquesta rutina.',why:'Es recomana repetir l’hàbit d’una persona.'},
  // Benefici
  {id:'b1',type:'benefici',text:'Si obrim la biblioteca al migdia, més alumnes tindran un lloc tranquil per estudiar.',why:'Es defensa una proposta pels avantatges que aporta.'},
  {id:'b2',type:'benefici',text:'Plantar arbres al pati donarà més ombra i farà més agradable l’estona d’esbarjo.',why:'La raó destaca els beneficis de la proposta.'},
  {id:'b3',type:'benefici',text:'Fer una pausa breu entre activitats pot ajudar-nos a recuperar l’atenció.',why:'S’argumenta a favor d’una acció pels seus efectes positius.'},
  {id:'b4',type:'benefici',text:'Compartir apunts amb qui ha faltat facilita que tothom pugui seguir les classes.',why:'La proposta es defensa perquè beneficia l’alumnat.'},
  // Estalvi / aprofitament
  {id:'e1',type:'estalvi',text:'Reparem les taules abans de comprar-ne de noves: així aprofitarem el material que encara serveix.',why:'Es proposa evitar el malbaratament de recursos.'},
  {id:'e2',type:'estalvi',text:'Fem servir els fulls per les dues cares per gastar menys paper.',why:'La raó és l’estalvi d’un recurs.'},
  {id:'e3',type:'estalvi',text:'Conservem els llibres en bon estat perquè els puguin utilitzar altres cursos.',why:'Es defensa aprofitar els recursos durant més temps.'},
  {id:'e4',type:'estalvi',text:'Planificar els encàrrecs en un sol desplaçament ens estalviarà temps i viatges.',why:'La proposta evita gastar temps i recursos de manera innecessària.'},
  // Causa-conseqüència
  {id:'c1',type:'causa',text:'Com que les notificacions interrompen la lectura, costa més mantenir el fil del text.',why:'S’explica una conseqüència causada per les interrupcions.'},
  {id:'c2',type:'causa',text:'Si plou durant el partit, la pista quedarà molla i no s’hi podrà jugar amb seguretat.',why:'Una causa comporta un efecte concret.'},
  {id:'c3',type:'causa',text:'La falta de ventilació fa que l’aire de l’aula sigui carregós.',why:'Es relaciona una causa amb la conseqüència que produeix.'},
  {id:'c4',type:'causa',text:'Quan es deixa l’aixeta oberta, es consumeix més aigua de la necessària.',why:'S’indica l’efecte d’una acció.'},
  // Exemple
  {id:'x1',type:'exemple',text:'Per exemple, a 4t B van crear un calendari compartit i ara recorden millor les dates dels exàmens.',why:'S’aporta un cas concret per il·lustrar una idea.'},
  {id:'x2',type:'exemple',text:'Un cas clar és el del club de lectura, que ha incorporat alumnes que abans no triaven llibres.',why:'Es dona un cas concret que dona suport a la proposta.'},
  {id:'x3',type:'exemple',text:'Al laboratori, per exemple, les instruccions amb dibuixos van reduir els errors en el muntatge.',why:'Un exemple concret il·lustra l’afirmació.'},
  {id:'x4',type:'exemple',text:'Com ara passa a l’institut veí, podem habilitar una zona tranquil·la per llegir.',why:'Es presenta un cas concret com a referència.'},
  // Comparació
  {id:'p1',type:'comparacio',text:'Repartir l’estudi en diversos dies és més eficaç que intentar aprendre-ho tot la nit abans.',why:'Es comparen dues maneres d’estudiar.'},
  {id:'p2',type:'comparacio',text:'Una ampolla reutilitzable dura més que una ampolla d’un sol ús.',why:'La raó es construeix comparant dues opcions.'},
  {id:'p3',type:'comparacio',text:'Llegir en silenci permet concentrar-se millor que llegir mentre sona música amb lletra.',why:'Es comparen els resultats de dues situacions.'},
  {id:'p4',type:'comparacio',text:'Una explicació amb un esquema és més fàcil de repassar que una pàgina sencera sense apartats.',why:'Es comparen dos formats i se’n destaca la diferència.'},
  // Justícia
  {id:'j1',type:'justicia',text:'Si dos alumnes han entregat el treball dins del mateix termini, se’ls hauria d’aplicar el mateix criteri de correcció.',why:'Es defensa un tracte igual per a situacions equivalents.'},
  {id:'j2',type:'justicia',text:'Tots els grups que comparteixen la pista haurien de disposar del mateix temps d’entrenament.',why:'Es demana repartir el temps amb equitat.'},
  {id:'j3',type:'justicia',text:'La norma sobre el soroll ha de ser igual per a totes les classes que fan examen alhora.',why:'Es reclama aplicar el mateix criteri a casos equivalents.'},
  {id:'j4',type:'justicia',text:'Qui ha rebut el mateix encàrrec i ha tingut el mateix termini hauria de tenir les mateixes condicions d’entrega.',why:'La raó es basa en la igualtat de condicions.'},
  // Majorità / quantitat
  {id:'q1',type:'majoria',text:'Vuit de cada deu alumnes consultats prefereixen que el torneig es faci divendres.',why:'La raó apel·la al nombre de persones que comparteixen una preferència.'},
  {id:'q2',type:'majoria',text:'La major part dels cursos ja separa els envasos i el paper en contenidors diferents.',why:'Es destaca que una pràctica és seguida per molta gent.'},
  {id:'q3',type:'majoria',text:'La proposta ha rebut el suport de gairebé tots els delegats de classe.',why:'L’argument es basa en la quantitat de persones que hi donen suport.'},
  {id:'q4',type:'majoria',text:'Cada vegada més famílies apunten els fills a activitats esportives després de classe.',why:'Es fa servir l’extensió creixent d’un fet com a raó.'},
  // Qualitat
  {id:'v1',type:'qualitat',text:'Aquest arxiu conserva l’únic enregistrament conegut de la primera representació de l’obra.',why:'Es destaca el valor singular i excepcional de l’enregistrament.'},
  {id:'v2',type:'qualitat',text:'La peça guanyadora destaca per la precisió dels detalls i la solidesa dels materials.',why:'La raó ressalta l’excel·lència de la peça.'},
  {id:'v3',type:'qualitat',text:'Aquest testimoni és especialment valuós perquè és l’únic que explica l’experiència des de dins.',why:'Es defensa la importància d’un element pel seu valor especial.'},
  {id:'v4',type:'qualitat',text:'El projecte mereix ser conservat: és una obra excepcional feta amb materials recuperats.',why:'Es destaca la qualitat i singularitat del projecte.'},
  // Dades i estadístiques
  {id:'d1',type:'dades',text:'El registre de la biblioteca mostra que els préstecs han augmentat un 18 % aquest trimestre.',why:'S’utilitza una xifra mesurable d’una font identificada.'},
  {id:'d2',type:'dades',text:'En l’enquesta del centre, 126 alumnes van dir que utilitzen la sala d’estudi cada setmana.',why:'Es presenta un resultat numèric d’una enquesta.'},
  {id:'d3',type:'dades',text:'Les dades de l’ajuntament indiquen que el consum d’aigua va baixar de 40 a 32 litres per persona.',why:'La justificació es basa en dades quantificables.'},
  {id:'d4',type:'dades',text:'L’informe del curs registra 27 incidències menys des que es va canviar l’entrada al pati.',why:'S’aporta una dada verificable per defensar la idea.'},
  // Principi o valor
  {id:'r1',type:'principi',text:'Tothom hauria de poder participar en les activitats, independentment de les seves capacitats.',why:'La raó es basa en el valor de la inclusió i la igualtat.'},
  {id:'r2',type:'principi',text:'Cal respectar la intimitat dels companys encara que una fotografia sigui divertida.',why:'L’argument apel·la al valor del respecte a la intimitat.'},
  {id:'r3',type:'principi',text:'Les decisions que afecten tot el curs s’haurien de prendre escoltant totes les veus.',why:'La raó es fonamenta en la participació i la igualtat.'},
  // Dilema
  {id:'l1',type:'dilema',text:'O revisem l’origen d’una notícia abans de compartir-la, o ens arrisquem a difondre informació falsa.',why:'Es presenten dues opcions i les conseqüències de cadascuna.'},
  {id:'l2',type:'dilema',text:'Podem reduir el soroll durant l’estudi o acceptar que alguns companys no puguin concentrar-se.',why:'Es plantegen dues alternatives amb resultats diferents.'},
  {id:'l3',type:'dilema',text:'O es reserva una part del pati per a activitats tranquil·les, o qui necessita calma es queda sense cap espai adequat.',why:'La tesi es defensa comparant dues alternatives i les seves conseqüències.'}
];
