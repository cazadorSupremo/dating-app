const express=require('express');
const app=express();
const port=8080; //En produccion seria el puerto 80
const path=require('path');
const session=require('express-session');
const passport=require('passport');
const LocalStrategy=require('passport-local').Strategy;
const fs=require('fs').promises;
const readLastLines=require('read-last-lines');
const multer=require('multer');
const upload=multer({dest: 'users-photos'});
const http=require('http').Server(app);
const io=require('socket.io')(http);
const bcrypt=require('bcrypt');
const saltRounds=10;
const {Client}=require('pg');
const client=new Client({
  user: 'postgres',
  database: 'postgres',
  password: '2020',
  host: 'localhost',   //Todos estos parametros, si no se declaran, se establecen por defecto (ver documentacion. En caso del host, el por defecto tambien es localhost, pero lo incluyo por inercia)
});
client.connect();
app.use(session({ secret: "secret", resave: false, saveUninitialized: true })); 
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(express.static('images'));
app.use(express.static('users-photos'));
app.use(express.static('Responsive-Image-Modal'));
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/croppie', express.static(__dirname + '/node_modules/croppie'));


async function readChatFile(usernameA, usernameB, templateOrWriteMessage){
  let content;
  try{
    content=await fs.readFile(`chats/${usernameA+'-'+usernameB}.txt`, 'utf8');
    if (templateOrWriteMessage){
      return content;
    }
    return usernameA+'-'+usernameB;
  } catch(err){
    try{
      content=await fs.readFile(`chats/${usernameB+'-'+usernameA}.txt`, 'utf8');
      if (templateOrWriteMessage){
        return content;
      }
      return usernameB+'-'+usernameA;
    } catch(err){
      return 'X';
     }
   }
}

function getChatFilesUserAndTheOtherUsername(allChatFiles, username){
  /*Esta funcion retorna una matriz de n filas y dos columnas. La primera columna contendra el nombre del archivo de chat 
  completo, mientras que la segunda contendra el otro nombre del otro usuario, con el que el usuario solicitante esta conversando,
  esto con el fin de no duplicar codigo haciendo una funcion que extraiga el nombre del otro usuario. El nombre del otro usuario
  servira para obtener su misma foto de perfil y tambien pegar a cada fila de la plantilla tal nombre*/
  let results=[];
  for (let i=0; i<allChatFiles.length; i++){
    //-4 porque '.txt' son los ultimos cuatro caracteres, y eso corresponde a la extension del archivo.
    let j=0, coincide=false, fileName=allChatFiles[i].slice(0, allChatFiles[i].length-4), contador='', theOtherUsername='';
    while (j<fileName.length && !coincide){
      if (fileName[j]!=='-'){
        contador+=fileName[j];
      } else{
        //Esta condicion verifica si el primer nombre de usuario coincide.
        contador===username? coincide=true : theOtherUsername=contador;
        contador=''
      }
      j++;
      if (j===fileName.length){
        //Esta condicion verifica si el segundo nombre de usuario coincide.
        contador===username? coincide=true : contador='';
      }
    }
    if (coincide){
      if (theOtherUsername!==''){
        results.push([allChatFiles[i], theOtherUsername]);
      } else{
        theOtherUsername=fileName.slice(j, fileName.length);
        results.push([allChatFiles[i], theOtherUsername]);
      }
    } 
  }
  return results;
}

function getUsernameFromMsg(message){
  let i=0, username='';
  while(message[i]!==':'){
    username+=message[i];
    i++;
  }
  return username;
}

let index=require('./routes/index.js');
app.use('/', index);

let userProfile=require('./routes/user-profile.js');
app.use('/my-profile', userProfile);

let search=require('./routes/search.js');
app.use('/search', search);

app.get('/chat-interface', async (req, res)=>{
  /*Obtengo todos los archivos de chats que incluyan el nombre del usuario.
  Luego, copio el ultimo mensaje escrito y la foto de cada usuario.
  Luego pego esa informacion (+ el nombre de cada usuario correspondiente) en 
  la plantilla  de interfaz de chat, cada uno en formato fila y como link.*/
  let chatFiles=await fs.readdir('chats');
  let results=getChatFilesUserAndTheOtherUsername(chatFiles, req.user);
  let profilePhotosOtherUsers=[], lastChatMessages=[], online=[], content='';
  for (let i=0; i<results.length; i++){
  	/*Aparte de las fotos y el ultimo mensaje de chat, aprovechare de obtener si el usuario esta online o no, para
  	poner o no el respectivo circulito :p*/
  	let isOnline=await client.query(`SELECT online FROM users WHERE username='${results[i][1]}'`);
  	online.push(colocarCirculoOnline(isOnline.rows[0].online));
    profilePhotosOtherUsers.push(await obtenerFotoPefilUsuario(results[i][1]));
    lastChatMessages.push(await readLastLines.read(`chats/${results[i][0]}`, 1));
  }
  let plantilla=await fs.readFile(__dirname+'/chat-interface.html', 'utf8');
  for (let j=0; j<results.length; j++){
    content+=`<tr><td><a href="chat?userName=${results[j][1]}">${online[j]}<img src="${profilePhotosOtherUsers[j]}"><p>${results[j][1]}
    </p>${lastChatMessages[j]}</a></td></tr>`;
  }
  plantilla=plantilla.replace('<!--#Chat with other users-->', content);
  res.send(plantilla);
});

app.get('/chat', async (req, res)=>{
  /*Entonces, el proceso es el siguiente:
  Primero obtengo la foto de perfil del usuario. 
  Luego anexo la foto y el nombre del usuario a la plantilla de chat
  Despues, busco en la carpeta chats si hay ya un historial entre los dos usuarios.
  Si lo hay, entonces anexo todo esos mensajes a la plantilla.
  Si no lo hay, entonces creo el archivo de texto correspondiente.
  Envio la plantilla.
  Fin
  */
  let profilePhoto=await obtenerFotoPefilUsuario(req.query.userName);
  let plantilla=await fs.readFile(__dirname+'/chat.html', 'utf8');
  plantilla=plantilla.replace('<!--#profilePhoto-->', `<img src="${profilePhoto}">`);
  //Aparte de los datos importantes, tambien consultare si el usuario esta online para poner o no el circulito respectivo :p
  let online=await client.query(`SELECT online FROM users WHERE username='${req.query.userName}'`);
  plantilla=plantilla.replace('<!--online-->', colocarCirculoOnline(online.rows[0].online));
  plantilla=plantilla.replace('<!--#username-->', `<p>${req.query.userName}</p>`);
  plantilla=plantilla.replace('<!--hide-->', `<div id="${req.user}"></div>`); /*Este div sin contenido solo se encargara
  de guardar el nombre del usuario como id para poder expresar el emisor de cada mensaje.*/
  let resultChatFile=await readChatFile(req.user, req.query.userName, true);
  if (resultChatFile!=='X'){
    plantilla=plantilla.replace('<!--messages-->', resultChatFile);
  } else{
    try{
      await fs.appendFile(`chats/${req.user+'-'+req.query.userName+'.txt'}`, '');
    } catch(err){
      console.log('Ha ocurrido un error al momento de crear un archivo de chat.');
    }
  }
  res.send(plantilla);
});

io.on('connection', (socket) => {
  socket.on('chat message', async (msg) => {
  	/*Antes de emitir el mensaje, debo asegurarme de que no sea codigo javascript, por lo que limpiare el mensaje con el
  	siguiente codigo:*/
  	while (msg[0].includes('<script>') || msg[0].includes('</script>')){
  	  msg[0]=msg[0].replace('<script>', '');
  	  msg[0]=msg[0].replace('</script>', '');
  	}
    io.emit('chat message', msg);
    let resultChatFile=await readChatFile(getUsernameFromMsg(msg[0]), msg[1], false);
    if (resultChatFile!==''){
      try{
        await fs.appendFile(`chats/${resultChatFile}.txt`, `<li>${msg[0]}</li>\n`);
      } catch(err){
        throw err;
      }
    }
  });
});

app.get('/account-settings', (req, res)=>{
  res.sendFile(__dirname+'/account-settings.html');
});

app.get('/delete-account', (req, res)=>{
  res.sendFile(__dirname+'/delete-account.html');
});

app.delete('/delete-account', async (req, res)=>{
  try{
    let message;
    let result=await client.query(`DELETE FROM users WHERE username='${req.user}' AND password='${req.body.password}'`);
    if (result.rowCount===1){
      message={message: 'Successful operation'};
      let userPhotos=await fs.readdir(`users-photos/${req.user}`);
      if (userPhotos.length>0){
        for (let i=0; i<userPhotos.length; i++){
          await fs.unlink(`users-photos/${req.user}/${userPhotos[i]}`);
        }
      }
    } else if (result.rowCount===0){
      message={message: 'Error'};
    }
    res.json(message);
  } catch(err){
    res.json({message: 'Error'});
  }
});

app.get('/change-password', (req, res)=>{ //como segundo parametro debe tener la funcion isLoggedIn
  res.sendFile(__dirname+'/change-password.html');
});

app.put('/change-password', (req, res)=>{ //como segundo parametro debe tener la funcion isLoggedIn
  try{
  	bcrypt.genSalt(saltRounds, (err, salt)=>{
  	  if (err){
  	  	return res.json({message: 'Error'});
  	  } 
      bcrypt.hash(req.body.password, salt, async (err, hash)=>{
        if (err){
          return res.json({message: 'Error'});
        }
        await client.query(`UPDATE users SET password='${hash}' WHERE username='${req.user}'`);
        res.json({message: 'Successful operation'});
      });
    });
  } catch(err){
  	res.json({message: 'Error'});
  }
});

http.listen(port, '0.0.0.0', ()=>{
  console.log('Aplicacion iniciada!');
});