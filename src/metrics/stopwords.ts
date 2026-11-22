/** Stopwords en español (sin tildes, para comparar). */
const RAW = `
a al algo algun alguna algunas alguno algunos ante antes aqui asi aun aunque bien cada casi como con contra cual cuales cuando cuanto de del demas desde donde dos el ella ellas ello ellos en entre era eran eras eres es esa esas ese eso esos esta estaba estaban estado estamos estan estar estas este esto estos estoy fue fueron fui ha habia hace hacer hacia han hasta hay la las le les lo los mas me mi mia mias mientras mio mios mis misma mismo mucho muchos muy nada ni no nos nosotros nuestra nuestro nunca o os otra otras otro otros para pero poco por porque pues que quien quienes se sea segun ser si sido siempre sin sobre sois solo somos son soy su sus tal tambien tan tanto te tengo tiene tienen todo todos tu tus un una unas uno unos usted ustedes va vamos van vas ver vez voy vos ya yo
ahi ahora alla alli ando aca hoy ayer luego despues manana ok okay oki listo bueno buena buenas buenos dice dijo digo hizo hola ire ido iba ira entonces ese esa tipo vaina hacer hago haces hecho mira mismo mucha muchas ojala puede puedo puedes pueden pasa quiero quieres quiere queria sabe sabes sabia sera seria seas sepa tendra tenia tener tenga tengas toda todas tuve vea veo vio vas vaya
the and you that this with for are not have but
q xq pq pa tb tmb pq
`;

export const STOPWORDS: Set<string> = new Set(RAW.split(/\s+/).filter(Boolean));

/** Palabras que nunca deben salir en el top (marcadores de WhatsApp). */
export const EXCLUDED_WORDS: Set<string> = new Set([
  'multimedia', 'omitido', 'omitida', 'omitidos', 'adjunto', 'imagen', 'sticker',
  'audio', 'video', 'documento', 'media', 'omitted', 'mensaje', 'eliminado', 'http', 'https', 'www', 'com',
]);
