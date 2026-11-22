/**
 * Español genérico (neutro): palabras muy comunes, sin regionalismos ni jerga, en minúsculas y sin tildes
 * (la ñ se conserva). Sirve para medir distintividad: "casa" o "tiempo" aparecen en cualquier chat y no
 * dicen nada de quién habla; "chimba", "ome", "parce" o "sumercé" no están aquí y por eso suben.
 * Escrita a mano; no se descarga nada.
 */
const RAW = `
a abajo abierto abrir abril acaso aceptar acerca acordar actual acuerdo adelante ademas adentro agosto agua ahi ahora
ahorrar aire al alegre alegria algo alguien algun alguna algunas alguno algunos alla alli alma alto amar amiga amigas
amigo amigos amistad amor ancho andar anillo animal ano anoche anos ante anterior antes antiguo anunciar aparecer
aprender aprovechar aqui arbol arriba arte asi asunto atras aunque ayer ayuda ayudar azul bajar bajo banco bano barato
barrio base bastante beber bebida bien bienvenido blanco boca boleto bolsa bonito brazo buen bueno buscar caballo
cabeza cada caer cafe caja calle calor cama cambiar cambio caminar camino campo cancion cansado cantar cantidad cara
carne caro carrera carro carta casa casar casi caso causa celebrar cena cerca cerrar chico cielo cien ciento cierto
cinco cine ciudad claro clase cliente cocina coger color comenzar comer comida como comprar comprender comun con
conocer conseguir considerar construir contar contento contestar continuar contra copa corazon corto cosa costar creer
cuadro cual cualquier cuando cuanto cuarto cuatro cubrir cuenta cuerpo cuidado cuidar cultura cumpleanos cumplir dar
datos de deber decidir decir dedo dejar del delante demas demasiado dentro derecha desayuno descansar descubrir desde
desear despacio despertar despues detras dia diario diciembre diecisiete dieta diferencia diferente dificil dinero
dios direccion disco distinto divertido doce doctor dolor domingo donde dormir dos dudar duda dulce durante durar
duro economia edad ejemplo el ella ellas ello ellos empezar empleo empresa en encantar encima encontrar enero enfermo
enorme ensenar entender entonces entrada entrar entre enviar equipo error escribir escuchar escuela ese eso espacio
espalda espana esperar espejo esposa esposo esquina esta estacion estado estar este estomago estudiante estudiar
estudio evitar examen existir explicar exterior facil falda falta faltar familia famoso favor febrero fecha feliz feo
fiesta fin final flor foto frase frente fresco frio fruta fuego fuente fuera fuerte fumar funcionar futbol futuro
ganar gastar gato gente gordo gracias grande gratis grupo guapo guardar gustar haber habitacion hablar hacer hacia
hambre hasta hay hecho hermana hermano hermoso hijo hija historia hogar hoja hombre hora hotel hoy huevo idea igual
importante importar imposible incluir increible informacion ingles inicio inteligente interesante interes interior
invierno invitar ir izquierda jamas jardin jefe joven juego jueves jugar julio junio junto justo kilo labio lado
lago lamentar lapiz largo lavar leche leer lejos lengua lento letra levantar libertad libre libro licencia limpio
lindo linea lista lleno llamada llamar llegar llevar llorar llover lluvia lo luego lugar luna lunes luz madre
madrugada mal maleta malo mama mandar manera mano manana mapa mar marido martes marzo mas mayo mayor media medico
medio mejor menos mensaje mes mesa meter metro mi miedo miel mientras miercoles mil minuto mio mirar mismo mitad
moda molestar momento moneda montana moreno morir mostrar motivo moto mucho mujer mundo museo musica muy nacer nada
nadar nadie naranja nariz natural necesario necesitar negocio negro ni nieve ningun ninguno nino noche nombre norte
nota noticia noventa noviembre novio nube nuestro nueve nuevo numero nunca objeto obra ocho octubre ocupado ocurrir
oeste oferta oficina oido oir ojo olvidar once operacion opinion oro oscuro otoño otro paciencia padre pagar pagina
pais paisaje pajaro palabra pan pantalon papa papel par para parar parecer pared pareja pariente parque parte partido
pasado pasar pasear paseo paso pelicula peligro pelo pelota pena pensar peor pequeno perder perdon perfecto periodico
permiso permitir pero perro persona pesar pescado pie piel pierna pieza pintar piso plan planta plata plato playa
plaza pobre poco poder policia politica pollo poner por porque posible precio preferir pregunta preguntar premio
preocupar preparar presente primavera primer primero primo principal principio probar problema producto profesor
programa prometer pronto propio proteger proximo prueba publico pueblo puerta pues puerto pues punto que quedar
quemar querer queso quien quince quinto quitar quizas radio rapido rato razon real recibir recibo recordar recuerdo
reflejo regalar regalo regla reir relacion reloj repetir respeto responder respuesta resto resultado reunion reves
rey rico rio rojo romper ropa rosa rubio ruido sabado saber sacar sal sala salida salir salud saludar sangre sano
sed seguir segundo seguro seis semana sentar sentir senal senor senora separar septiembre ser serio servicio servir
sesenta setenta si siempre siete siglo siguiente silla simple sin sino sistema sitio situacion sobre sol solo
soltero sombra sonar sonreir sopa sorpresa subir suceder suelo sueno suerte suficiente sur tabla tal talento
tamano tambien tampoco tan tanto tarde tarea tarjeta taza te teatro techo tela telefono television tema temer
temprano tener tercero terminar tiempo tienda tierra tio tipo tirar titulo toalla tocar todavia todo tomar tonto
trabajar trabajo traer traje tranquilo tratar trece treinta tren tres triste tu tuyo ultimo un unico unir uno usar
usted util uva vaca vacaciones vacio valer valor vaso vecino veinte vender venir ventana ver verano verdad verde
vestido vestir vez viaje viajar vida viejo viento viernes vino visita visitar vista vivir volar volver voz vuelo
y ya yo zapato zona
aca acabar acompanar actividad acto actuar adios adonde aficion agradecer ahorita alegrar alimento almorzar almuerzo
alquilar alumno amanecer ambos amplio animar anotar apagar aparato apenas aplicar apoyar aqui arreglar asegurar
asistir aspecto atencion atender aumentar ausente avion avisar ayudante bailar baile bajada balon barco basico
basta bastar belleza beneficio besar beso biblioteca bicicleta billete boda bolso bondad borrar bosque botella
brillar buscador cabello cabo cadena calidad caliente callar calmar camara camisa campana cancha cansar capaz
capital carino carretera casado cena centro cerrado chao chica chiste ciencia cierre cita clave cobrar cocinar
codigo coleccion colegio colocar comenzar comentar comentario comienzo comision compania compartir completo
compra comprar concurso conductor conferencia confianza confirmar conforme conjunto conmigo conocido conocimiento
consejo consulta contacto contenido contigo contrario control conversar copiar correcto correo correr cortar
costumbre crear crecer crisis cruzar cuadrado cuento cuestion cumplido curso dato debajo decision declarar defecto
defender dejar delicioso demostrar deporte derecho desarrollo descanso descuento desear desierto desorden destino
detalle dia dibujar dibujo dificultad dirigir discutir disenar disfrutar disponible distancia diversion doble
dolar domicilio donar dueno duda dudoso ejercicio elegir embargo emocion empezar enamorar encender encuentro
energia enfermedad enojar ensalada entender enterar entero entrega entregar entrevista escena esconder escritorio
escrito esfuerzo espectaculo esperanza espiritu esposa estilo estrella estructura evento exacto excelente
experiencia explicacion expresar extrano fabrica factura falso fama farmacia favorito fe felicidad felicitar
festival fila filtro firmar fisico flexible fondo forma formar foro fotografia fracaso frecuente fuera fuerza
funcion fundamental gafas galleta garantia gasolina gastos generar general genial gesto gobierno golpe gordo
gracioso grado gran grave gripa guerra guia guitarra gusto habitante habito hallar hamburguesa harto helado
herida herramienta hierro higiene hilo hobby honesto horario horrible hospital huir humano humor idioma iglesia
imagen imaginar impedir impuesto incluso indicar individuo industria informar inmediato inscribir instante
instrucciones intentar interno internet inutil invitado jabon jugador juicio juntos jurar justicia juventud
lamentable lanzar lastima lavado lectura legal lejano lectura lesion levantar ley liberar libreria ligero limite
limpiar listo literatura llanta llave local loco lograr lucha lujo madera madurar maestro mal mama mantener
maquina marca marcar marchar mascota masa matar material matrimonio maximo mayoria medida mediodia memoria mencion
menor mente mentir mentira mercado merecer meta metodo miembro minimo misterio mitad mochila modelo moderno modo
mojado molestia monton moral motor movimiento mover mudar multa muneca muro musical nacional nada naturaleza
navidad necesidad negar nervioso niebla nivel nocturno normal notar novedad nuestra nunca obedecer objetivo
obligar observar obtener ocasion ocupar odiar ofrecer olla opcion oportunidad orden ordenar organizar orgullo
origen otono pagar palacio panaderia papeles parada parecido participar particular pasaje pasajero pasillo pasion
paso pastel patio paz pedido pedir pegar pelear peligroso pelicula pelirrojo pensamiento pensar perfil permanecer
personal personaje pesado petroleo pico pila piloto pintura pista placer planear plazo pleno pluma poblacion
pobreza poema poesia politico poner popular portar posicion practicar practico precioso preciso predecir
preferencia premiar prenda prensa preparado presencia presentar presidente presion prestar prestigio previo
primavera principe prisa privado probable proceso producir profesion profundo promesa pronunciar propiedad
propina propuesta proyecto prudente publicar puesto pulsera quedar queja quejar quemado quieto quimica rabia
racion rama rango rapidez rareza raro reaccion realidad realizar rebajar recado receta recibir reciente recoger
recomendar reconocer recorrer recreo recuperar recurso red reducir reforma refresco refugio regalo region
registro regresar regreso reina relajar relato religion remedio renovar reparar repente reportar representar
reserva resolver respirar responsable restaurante resultar retraso retrato reunir revisar revista rezar riesgo
rincon ritmo roble rodear rogar romantico ruta sabor sabroso sacar sagrado salario salon saludo salvar sandalia
sano satisfecho secreto sector seguridad selva semilla senda sensacion sentido sentimiento separado sequia
servir severo sexo siguiente silencio simpatico sincero sitio sobrar sobrino social sociedad socio soldado
solucion sonido sonrisa soportar sorprender sospechar suave subida sucio sudor suelto sufrir sugerir suma
superar supermercado suponer supuesto susto tacon tal tapar tardar tarifa taxi tecnologia telefonear tema
temperatura tendencia tenis tension teoria terreno tesoro texto tia timbre tiempo timido tinto tipico tirar
tobillo tomate tono torpe torre tos total trabajador tradicion trafico tramite trampa transporte tranquilidad
tratamiento trato trozo truco turismo turista ubicar unidad universidad universo urgente usuario utilizar vacuna
vagon valiente vario varios vecindario vehiculo vela velocidad vencer vendedor venta verdadero version vestuario
veterinario viajero victoria vigilar villa violento visible vitamina vivienda vivo vocabulario volumen voluntad
votar vuelta
`;

export const BASELINE_ES: Set<string> = new Set(RAW.split(/\s+/).filter(Boolean));

// Formas verbales y palabras cotidianas muy frecuentes en cualquier chat en español (sin tildes).
// Se añadieron tras probar con chats reales: "creo", "entiendo", "mañana" o "dias" salían como "expresiones".
const EXTRA = `
creo crees cree creemos creen creia crei pienso piensas piensa pense penso entiendo entiendes entiende entendi entendio
se sabes sabe sabia supe supo sabemos saben quiero quieres quiere queria quise quiso puedo puedes puede podia pude pudo
tengo tienes tiene tenia tuve tuvo tenemos tienen estoy estas esta estaba estuve estuvo estamos estan voy vas va iba fui
fue vamos van vengo vienes viene vino llego llegas llega llegue llego llegamos llegan sali salio salgo sale salimos
paso pasa pasan pase pasamos pasaste digo dices dice dije dijo dijiste decia hago haces hace hice hizo hiciste hacemos
veo ves ve vi vio viste veia mira miro mire doy das da di dio dimos pongo pones pone puse puso tomo toma tome comi como
come comer comimos duermo duerme dormi dormir durmio trabajo trabaja trabaje trabajando estudio estudia estudiando
espero esperas espera espere llamo llama llame llamaste escribo escribe escribi escribiste mando manda mande mandaste
dejo deja deje dejaste busco busca busque encontre encontro siento sientes siente senti sintio parece parecia gusta gusto
gustan encanta necesito necesitas necesita sirve importa falta faltan queda quedo quede toca toco hablamos hablo habla
hable hablaste hablar contar cuento cuenta conte dormiste comiste llegaste saliste fuiste viniste hiciste
mañana hoy ayer dia dias noche noches tarde tardes semana semanas mes meses año años hora horas minuto minutos rato momento
vez veces cosa cosas casa trabajo clase clases universidad colegio comida almuerzo desayuno cena celular telefono mensaje
mensajes foto fotos video videos audio audios gente persona personas mama papa hermano hermana amigo amiga amigos amigas
bien mal mejor peor mucho mucha muchos muchas poco poca pocos pocas nada todo todos todas algo nadie siempre nunca tambien
tampoco todavia ya aun luego despues antes ahora entonces bueno buena buenos buenas igual claro verdad seguro super casi
`;
for (const w of EXTRA.split(/\s+/)) if (w) BASELINE_ES.add(w);

// Colombianismos o muletillas que se colaron arriba: NO son español neutro y deben poder destacar.
for (const w of ['pues', 'ahorita', 'harto', 'gripa', 'tinto', 'listo', 'chao', 'plata', 'carro', 'rato', 'bacano']) {
  BASELINE_ES.delete(w);
}
