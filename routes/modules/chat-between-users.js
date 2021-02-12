const get_user_profile_picture=require('./get-user-profile-picture.js');
let htmlFilePath=__dirname.replace('/routes', ''); htmlFilePath=htmlFilePath.replace('/modules', '');
const fs=require('fs').promises;
const {Client}=require('pg');
const client=new Client({
  user: 'postgres',
  database: 'postgres',
  password: '2020',
  host: 'localhost',   //Todos estos parametros, si no se declaran, se establecen por defecto (ver documentacion. En caso del host, el por defecto tambien es localhost, pero lo incluyo por inercia)
});
client.connect();
const onlineCircle=require('./paste-circle-online.js');
const read_chat_file=require('./read-chat-file.js');
const lineReader=require('line-reader');
const lineReplace=require('line-replace');

exports.chatBetweenUsers=async (req, res)=>{
   /*Entonces, el proceso es el siguiente:
  Primero obtengo la foto de perfil del usuario. 
  Luego anexo la foto y el nombre del usuario a la plantilla de chat
  Despues, busco en la carpeta chats si hay ya un historial entre los dos usuarios.
  Si lo hay, entonces anexo todo esos mensajes a la plantilla.
  Si no lo hay, entonces creo el archivo de texto correspondiente.
  Envio la plantilla.
  Fin
  */
  let profilePhoto=await get_user_profile_picture.getUserProfilePicture(req.query.userName);
  let plantilla=await fs.readFile(htmlFilePath+'/chat.html', 'utf8');
  plantilla=plantilla.replace('<!--#profilePhoto-->', `<img src="${profilePhoto}">`);
  //Aparte de los datos importantes, tambien consultare si el usuario esta online para poner o no el circulito respectivo :p
  let online=await client.query(`SELECT online FROM users WHERE username='${req.query.userName}'`);
  plantilla=plantilla.replace('<!--#username-->', `<p>${req.query.userName}</p>`);
  plantilla=plantilla.replace('<!--hide-->', `<div id="${req.user}"></div>`); /*Este div sin contenido solo se encargara
  de guardar el nombre del usuario como id para poder expresar el emisor de cada mensaje.*/
  plantilla=plantilla.replace('<!--online-->', onlineCircle.pasteCircleOnline(online.rows[0].online));
  let resultChatFile=await read_chat_file.readChatFile(req.user, req.query.userName, true);
  if (resultChatFile!=='X'){
    plantilla=plantilla.replace('<!--messages-->', resultChatFile);
  } else{
    try{
      await fs.appendFile(`chats/${req.user+'-'+req.query.userName+'.txt'}`, '');
    } catch(err){
      console.log('Ha ocurrido un error al momento de crear un archivo de chat.');
    }
  }
   /*Debo modificar esta codigo con el fin de borrar (si los hay) los mensajes no vistos.
  Sera facil, simplemente debo ubicar el archivo de nuevos usuarios del usuario solicitante, y, sustitur 
  la correspondiente linea del usuario emisor, con la nueva linea, que contendra 0 como la cantidad de nuevos 
  mensajes. Fin*/
  let lineCount=1;
  lineReader.eachLine(`./chats/new-messages/${req.user}.txt`, (line, last)=>{
    if (line.includes(req.query.userName)){
      lineReplace({
        file: `./chats/new-messages/${req.user}.txt`,
        line: lineCount,
        text: `${req.query.userName} : 0\n`,
        addNewLine: false,
        callback: ({ file, line, text, replacedText, error }) => {}
      });
      return false; // stop reading
    }
    lineCount++;
  });
  res.send(plantilla);
}