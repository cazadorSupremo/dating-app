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
app.use('/', index);

const userProfile=require('./routes/user-profile.js');
app.use('/my-profile', userProfile);

const search=require('./routes/search.js');
app.use('/search', search);

const chat=require('./routes/chat.js');
app.use('/chat-interface', chat);

const http=require('http').Server(app);
const io=require('socket.io')(http);
const read_chat_file=require('./routes/modules/read-chat-file.js');
const get=require('./routes/modules/get-username-from-message.js');
const fs=require('fs').promises;
io.on('connection', (socket) => {
  socket.on('chat message', async (msg) => {
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
  });
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});


const accountSettings=require('./routes/account-settings.js');
app.use('/account-settings', accountSettings);

http.listen(port, '0.0.0.0', ()=>{
  console.log('Aplicacion iniciada!');
});