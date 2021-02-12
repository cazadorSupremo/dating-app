const lineReader=require('line-reader');
const lineReplace=require('line-replace');
const extract_number=require('./extract-number.js');
/*Extraigo la linea correspondiente al usuario emisor. Si hay numero, lo extraigo, lo parseo a entero, y le sumo 1.
Luego vuelvo a escribir ese numero sustiyendolo en la linea. Luego sobreescribo la linea en el archivo con el nuevo numero*/
/*Extraigo el numero de line. Luego lo guardo en una variable llamada number. Luego creo una variable newNumber, cuyo contenido
sera la suma de la variable number convertida a numero entero (de cadena a numero) y uno.
Luego escribo la siguiente instruccion
line=line.replace(number, newNumber.toString);
Y luego sustituyo esa linea con el modulo lineReplace, usando el contador de linea que se corresponde con el numero de linea
que va a ser sustituido.
Eso es todo...
Otra cosa: En vez de un espacio en blanco, podria asignar 0 cuando hay 0 mensajes nuevos de un usuario emisor, si, eso tiene logica.*/
let lineCount=1;
exports.newChatMessages=(issuingUser, receivingUser)=>{
  lineReader.eachLine(`./chats/new-messages/${receivingUser}.txt`, (line, last)=>{
    if (line.includes(issuingUser)){
      let numberOfNewMessages=extract_number.extractNumber(line);
      if (numberOfNewMessages!==''){
        let newNumber=parseInt(numberOfNewMessages)+1;
        newNumber=newNumber.toString();
        let lineWithNewNumber=line.replace(numberOfNewMessages, newNumber);
        lineReplace({
          file: `./chats/new-messages/${receivingUser}.txt`,
          line: lineCount,
          text: lineWithNewNumber+'\n',
          addNewLine: false,
          callback: ({ file, line, text, replacedText, error }) => {}
        });
      }
      return false; // stop reading
    }
    lineCount++;
  });
}