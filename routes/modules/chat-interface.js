const fs=require('fs').promises;
const get=require('./get-chat-files-user-and-the-other-username.js');
const {Client}=require('pg');
const client=new Client({
  user: 'postgres',
  database: 'postgres',
  password: '2020',
  host: 'localhost',   //Todos estos parametros, si no se declaran, se establecen por defecto (ver documentacion. En caso del host, el por defecto tambien es localhost, pero lo incluyo por inercia)
});
client.connect();
const onlineCircle=require('./paste-circle-online.js');
const profilePhoto=require('./get-user-profile-picture.js');
const readLastLines=require('read-last-lines');
let htmlFilePath=__dirname.replace('/routes', ''); htmlFilePath=htmlFilePath.replace('/modules', '');
const lineReader=require('line-reader');
const extract_number=require('./extract-number.js');
exports.chatInterface=async (req, res)=>{
 /*Obtengo todos los archivos de chats que incluyan el nombre del usuario.
  Luego, copio el ultimo mensaje escrito y la foto de cada usuario.
  Luego pego esa informacion (+ el nombre de cada usuario correspondiente) en 
  la plantilla  de interfaz de chat, cada uno en formato fila y como link.*/
  let chatFiles=await fs.readdir('chats');
  let results=get.getChatFilesUserAndTheOtherUsername(chatFiles, req.user);
  let profilePhotosOtherUsers=[], lastChatMessages=[], online=[], notificationNewMessages=[], content='';
  for (let i=0; i<results.length; i++){
    /*Aparte de las fotos y el ultimo mensaje de chat, aprovechare de obtener si el usuario esta online o no, para
    poner o no el respectivo circulito :p*/
    let isOnline=await client.query(`SELECT online FROM users WHERE username='${results[i][1]}'`);
    online.push(onlineCircle.pasteCircleOnline(isOnline.rows[0].online));
    profilePhotosOtherUsers.push(await profilePhoto.getUserProfilePicture(results[i][1]));
    lastChatMessages.push(await readLastLines.read(`chats/${results[i][0]}`, 1));
  }
  /*Respecto a la notificacion de nuevos mensajes:
  Voy hacia el archivo de nuevos mensajes del usuario solicitante (req.user). Obtengo la linea correspondiente de cada
  usuario. Añado cada linea al array de notificaciones de nuevos mensajes. Luego, al momento de generar la plantilla, ego al final
  el numero extraido de cada linea, representado como un circulo rojo con el numero de color blanco.*/
lineReader.eachLine(`./chats/new-messages/${req.user}.txt`, async (line, last)=>{
    /*Este array tendra una longitud menor o igual a la cantidad de de usuarios con los que ha chateado el usuario.
    ¿Por que? Porque aunque el usuario solicitante tenga un chat con otro usuario, esto no implica que tenga un
    registro de nuevos mensajes de ese otro usuario. La razon es que el usuario solicitante le ha enviado mensajes
    al otro usuario, pero el otro usuario puede no haberle enviado ni siquiera el primer mensaje!. En este caso,
    no habra un registro/linea correspondiente en el archivo de nuevos mensajes del usuario solicitante relacionado a 
    ese otro usuario que nunca le ha enviado un mensaje. Esto explicara el por que hago un bucle while con las respectivas
    instrucciones dentro del siguiente bucle for al momento de generar la plantilla.*/
    notificationNewMessages.push(line);
    if (last){ //last es true si es la ultima linea, falso en caso onstrario.
      let plantilla=await fs.readFile(htmlFilePath+'/chat-interface.html', 'utf8');
      for (let j=0; j<results.length; j++){
        content+=`<tr><td><a href="/chat-interface/chat?userName=${results[j][1]}">${online[j]}<img src="${profilePhotosOtherUsers[j]}"><p>${results[j][1]}
        </p>${lastChatMessages[j]}</a>`;
        let k=0, flag=false;
        while (k<notificationNewMessages.length && !flag){
          if (notificationNewMessages[k].includes(results[j][1])){
            if (parseInt(extract_number.extractNumber(notificationNewMessages[k]))>0){
              content+=`<div class="newMessages">${extract_number.extractNumber(notificationNewMessages[k])}</div>`;
            }
            flag=true;
          }
          k++;
        }
        content+='</td></tr>';
      }
      plantilla=plantilla.replace('<!--#Chat with other users-->', content);
      res.send(plantilla);
    }
  });
}