const express=require('express');
const app=express();
const port=8080; //En produccion seria el puerto 443 (https)
const session=require('express-session');
const passport=require('passport');
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
const index=require('./routes/index.js');
const userProfile=require('./routes/user-profile.js');
const search=require('./routes/search.js');
const accountSettings=require('./routes/account-settings.js');
const chat=require('./routes/chat.js');
app.use('/', index);
app.use('/my-profile', userProfile);
app.use('/search', search);
app.use('/account-settings', accountSettings);
app.use('/chat-interface', chat);

const http=require('http').Server(app);
const io=require('socket.io')(http);
const read_chat_file=require('./routes/modules/read-chat-file.js');
const get=require('./routes/modules/get-username-from-message.js');
const fs=require('fs').promises;
/*const lineReader=require('line-reader');
const lineReplace=require('line-replace');
const extract_number=require('./routes/modules/extract-number.js');*/
const new_chat_messages=require('./routes/modules/new-chat-messages.js');
let usersConnectedToChat={};
io.on('connection', socket => {
  socket.on('user online', users => {
  	if (!usersConnectedToChat.hasOwnProperty(users[0])){
      Object.defineProperty(usersConnectedToChat, users[0], {value: users[1], enumerable: true, configurable: true});
      socket.user=users[0];
    }
  });
  //console.log(socket.username);
  socket.on('chat message', async msg => {
  	/*Antes de emitir el mensaje, debo asegurarme de que no sea codigo javascript, por lo que limpiare el mensaje con el
  	siguiente codigo:*/
  	while (msg[0].includes('<script>') || msg[0].includes('</script>')){
  	  msg[0]=msg[0].replace('<script>', '');
  	  msg[0]=msg[0].replace('</script>', '');
  	}
    io.emit('chat message', msg);
    let resultChatFile=await read_chat_file.readChatFile(get.getUsernameFromMsg(msg[0]), msg[1], false);
    if (resultChatFile!==''){
      try{
        await fs.appendFile(`chats/${resultChatFile}.txt`, `<li>${msg[0]}</li>\n`);
      } catch(err){
        throw err;
      }
    }
    let issuingUser=get.getUsernameFromMsg(msg[0]), receivingUser=msg[1];
    if (!(usersConnectedToChat.receivingUser===issuingUser)){ //Esto implica que el usuario receptor no esta conectado al chat con el usuario emisor.
      try{
        await fs.stat(`chats/new-messages/${receivingUser}.txt`);
        let content=await fs.readFile(`./chats/new-messages/${receivingUser}.txt`, 'utf8');
        if (!content.includes(issuingUser)){
          await fs.appendFile(`./chats/new-messages/${receivingUser}.txt`, issuingUser+': 0\n');
        }
        new_chat_messages.newChatMessages(issuingUser, receivingUser);
      } catch(err){
        if (err.code==='ENOENT'){
          await fs.appendFile(`./chats/new-messages/${receivingUser}.txt`, '');
          await fs.appendFile(`./chats/new-messages/${receivingUser}.txt`, issuingUser+': 0\n');
          new_chat_messages.newChatMessages(issuingUser, receivingUser);
        }
      }
    }
  });
  socket.on('disconnect', ()=>{
  	let x=socket.user;
  	delete usersConnectedToChat[x];
  	delete socket.user;
  });
});

http.listen(port, '0.0.0.0', ()=>{
  console.log('Aplicacion iniciada!');
});