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

exports.chatInterface=async (req, res)=>{
 /*Obtengo todos los archivos de chats que incluyan el nombre del usuario.
  Luego, copio el ultimo mensaje escrito y la foto de cada usuario.
  Luego pego esa informacion (+ el nombre de cada usuario correspondiente) en 
  la plantilla  de interfaz de chat, cada uno en formato fila y como link.*/
  let chatFiles=await fs.readdir('chats');
  let results=get.getChatFilesUserAndTheOtherUsername(chatFiles, req.user);
  let profilePhotosOtherUsers=[], lastChatMessages=[], online=[], content='';
  for (let i=0; i<results.length; i++){
    /*Aparte de las fotos y el ultimo mensaje de chat, aprovechare de obtener si el usuario esta online o no, para
    poner o no el respectivo circulito :p*/
    let isOnline=await client.query(`SELECT online FROM users WHERE username='${results[i][1]}'`);
    online.push(onlineCircle.pasteCircleOnline(isOnline.rows[0].online));
    profilePhotosOtherUsers.push(await profilePhoto.getUserProfilePicture(results[i][1]));
    lastChatMessages.push(await readLastLines.read(`chats/${results[i][0]}`, 1));
  }
  let plantilla=await fs.readFile(htmlFilePath+'/chat-interface.html', 'utf8');
  for (let j=0; j<results.length; j++){
    content+=`<tr><td><a href="/chat-interface/chat?userName=${results[j][1]}">${online[j]}<img src="${profilePhotosOtherUsers[j]}"><p>${results[j][1]}
    </p>${lastChatMessages[j]}</a></td></tr>`;
  }
  plantilla=plantilla.replace('<!--#Chat with other users-->', content);
  res.send(plantilla);
}