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
app.use(passport.initialize());
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/croppie', express.static(__dirname + '/node_modules/croppie'));
passport.use('local-login', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
  }, async (username, password, done)=>{
     try{
       let consultaDeContraseña=await client.query(`SELECT password FROM users WHERE email='${username}'`);
       if (consultaDeContraseña.rows.length===1){
         bcrypt.compare(password, consultaDeContraseña.rows[0].password, async (err, result)=>{
       	   if (err) throw err;
           if (result){
           	 //Consulto el nombre de usuario para enviar el id con el objetivo de serializar. El username sera el req.user
           	 let consultaDeUsername=await client.query(`SELECT username FROM users WHERE email='${username}'`);
             let newUser={id: consultaDeUsername.rows[0].username};
             return done(null, newUser);
           }
           return done(null, false, {message: 'Usuario o contraseña incorrecta!'});
         });
       } else{
       	 return done(null, false, {message: 'Usuario o contraseña incorrecta!'});
       }
     } catch(err){
       console.log('Error en el inicio de sesion del usuario.');
       return done(err);
     }
}));
passport.serializeUser((user, done)=>{
  return done(null, user.id);
});
passport.deserializeUser(async (id, done)=>{
  try{
    let consultaIdDeUsuario=await client.query(`SELECT * FROM users WHERE username='${id}'`);
    if (consultaIdDeUsuario.rows.length===1){
      return done(false, id); //Si esta el usuario, por lo que error valdra false
    } else{
      return done(true, id);
    }
  } catch(err){
    console.log('Error en la desearilizacion del usuario.');
    return done(err, id);
  }
});
function isLoggedIn(req, res, next) {
	// if user is authenticated in the session, carry on
	if (req.isAuthenticated()){
		return next();
	}
	// if they aren't redirect them to the home page
	res.redirect('/');
}
async function obtenerFotoPefilUsuario(username){
  /*En la consulta, verifico correo o usuario, porque cuando es el usuario, envia el idUsuario(su correo) y cuando el usuario
   consulta el perfil del otro usuario, se envia el nombre de usuario del perfil consultado, debo corregir esto 
   para que se estandarice como nada mas el nombre del usuario!*/
  let sexo=await client.query(`SELECT sex FROM users WHERE username='${username}'`), avatar;
  if (sexo.rows[0].sex){
    avatar='default-avatars/male.jpeg';
  } else{
    avatar='default-avatars/female.jpeg';
  }
  const etiquetaFotoDePerfil='etiquetaFotoDePerfilxxxxx';
  let srcFotoDePerfil='', fotos;
  try{
    let fileHandle=await fs.opendir(`users-photos/${username}`);
    fotos=await fs.readdir(`users-photos/${username}`);
    fileHandle.close();
  } catch(err){
    fotos=[];
  }
  if (fotos.length===0){
    srcFotoDePerfil=avatar; 
  } else{
      let i=0, flag=false;
      while (i<fotos.length && !flag){
        if (fotos[i].includes(etiquetaFotoDePerfil)){
          srcFotoDePerfil=`${username}/${fotos[i]}`;
          flag=true;
        }
        i++;
      }
      if (!flag){
        srcFotoDePerfil=avatar;
      }
  }
  return srcFotoDePerfil;
}
async function rellenarPlantillaConDatos(rutaDePlantilla, idUsuario, usuarioSolicitante){ /*El tercer parametro (tipo bool) de esta funcion
  definira si se generara el perfil del propio usuario solicitante o el perfil de otro usuario ajeno*/
  try{
  	/*Este codigo se encargara de generar el perfil del usuario.
     Nota:Ordenar los datos en la base de datos para reducir este codigo(refactorizar) a un bucle...*/
    //Primero me encargo de la foto de perfil:
    const etiquetaFotoDePerfil='etiquetaFotoDePerfilxxxxx';
    let srcFotoDePerfil=await obtenerFotoPefilUsuario(idUsuario);
    //Luego de definir la foto de perfil del usuario, empiezo con los demas datos, para poder generar la plantilla.
    let plantilla=await fs.readFile(rutaDePlantilla, 'utf8');
    /*En la consulta, verifico correo o usuario, porque cuando es el usuario, envia el idUsuario(su correo) y cuando el usuario
    consulta el perfil del otro usuario, se envia el nombre de usuario del perfil consultado, debo corregir esto 
    para que se estandarice como nada mas el nombre del usuario!*/
    if (usuarioSolicitante){
      plantilla=plantilla.replace('<!--Fotos del mismo o fotos de otro usuario-->', '<a href="my-profile-photos">Fotos</a>');
      plantilla=plantilla.replace('<!--editar perfil o chat-->', '<a href="edit-profile">Editar perfil</a>');
    } else{
      plantilla=plantilla.replace('<!--Fotos del mismo o fotos de otro usuario-->', '<a id="photos" href="other-user-profile-photos">Fotos</a>');
      plantilla=plantilla.replace('<!--editar perfil o chat-->', '<a id="chat" href="chat">Mensaje</a>')
    }
    let result=await client.query(`SELECT * FROM users WHERE username='${idUsuario}'`);
    plantilla=plantilla.replace('foto de perfil', srcFotoDePerfil);
    plantilla=plantilla.replace('<!--online-->', colocarCirculoOnline(result.rows[0].online));
    plantilla=plantilla.replace('Pais, Estado, Ciudad', result.rows[0].country);
    plantilla=plantilla.replace('Nombre de usuario', result.rows[0].username);
    let nameAndLastName=result.rows[0].name+' '+result.rows[0].lastname;
    plantilla=plantilla.replace('Nombre y Apellido', nameAndLastName);
    plantilla=plantilla.replace('Encabezado', result.rows[0].header===null? '' : result.rows[0].header);
    plantilla=plantilla.replace('valor', result.rows[0].heigth===null? '' : result.rows[0].heigth);
    plantilla=plantilla.replace('valor', result.rows[0].bodytype===null? '' : result.rows[0].bodytype);
    plantilla=plantilla.replace('valor', result.rows[0].ethnicgroup===null? '' : result.rows[0].ethnicgroup);
    plantilla=plantilla.replace('valor', result.rows[0].maritalstatus===null? '' : result.rows[0].maritalstatus);
    plantilla=plantilla.replace('valor', result.rows[0].sons? 'Yes' : 'No');
    plantilla=plantilla.replace('valor', result.rows[0].housingsituation===null? '' : result.rows[0].housingsituation); 
    plantilla=plantilla.replace('valor', result.rows[0].educationallevel===null? '' : result.rows[0].educationallevel);
    plantilla=plantilla.replace('valor', result.rows[0].work? 'Yes' : 'No');
    plantilla=plantilla.replace('valor', result.rows[0].smokes? 'Yes' : 'No');
    plantilla=plantilla.replace('valor', result.rows[0].drink? 'Yes' : 'No');
    plantilla=plantilla.replace('Descripcion', result.rows[0].description===null? '' : result.rows[0].description);
    //Faltan mas datos, pero por ahora me serviran de prueba.
    return plantilla;
  } catch(err){
  	return 'Error';
  }
}
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
app.get('/', (req, res)=>{
  if (req.isAuthenticated()){
    res.redirect('/my-profile');
  } else{
    res.sendFile(__dirname+'/index.html');
  }
});
app.get('/registry', (req, res)=>{
  res.sendFile(__dirname+'/registry.html');
});

app.get('/succesful-sign-up', (req, res)=>{
  res.sendFile(__dirname+'/successful-sign-up.html');
});

app.get('/error:sign-up-failed', (req, res)=>{
  res.sendFile(__dirname+'/error:sign-up-failed.html');
});

app.get('/ToS', (req, res)=>{
  res.sendFile(__dirname+'/ToS-and-privacy-policy/ToS.html');
});
app.get('/privacy-policy', (req, res)=>{
  res.sendFile(__dirname+'/ToS-and-privacy-policy/privacy-policy.html');
});
app.post('/signin', async (req, res)=>{
  if (req.body.sex==='man'){
    req.body.sex=1;
  } else {
  	req.body.sex=0;
  }
  try{
  	//Compruebo si ya esta ese correo o nombre de usuario registrado.
  	let comprobacionDeEmail=await client.query(`SELECT EXISTS(SELECT * FROM users WHERE email='${req.body.email}')`);
  	let comprobacionDeUsername=await client.query(`SELECT EXISTS (SELECT * FROM users WHERE username='${req.body.username}')`);
  	console.log(comprobacionDeEmail.rows[0].exists);
  	console.log(comprobacionDeUsername.rows[0].exists);
  	if (!comprobacionDeEmail.rows[0].exists && !comprobacionDeUsername.rows[0].exists){
      bcrypt.genSalt(saltRounds, (err, salt)=>{
        if (err) throw err;
        bcrypt.hash(req.body.password, salt, async (err, hash)=>{
          if (err) throw err;
          //Hasheo y agrego salt a la contraseña para almacenarla en la base de datos.
          let hashedPassword=hash;
          //Luego inserto la contraseña hasheada junto al resto de los datos a la base de datos para crear al nuevo usuario.
          let registroDeNuevoUsuario=`INSERT INTO users (email, password, username, name, lastName, sex, age, country) values('${req.body.email}', '${hashedPassword}', 
            '${req.body.username}', '${req.body.name}', '${req.body.lastName}', '${req.body.sex}', '${req.body.age}', '${req.body.country}')`;
          await client.query(registroDeNuevoUsuario);
          console.log('Nuevo usuario registrado');
          res.redirect('/succesful-sign-up');
        });
      });
  	} else{
  	  res.redirect('/error:sign-up-failed');
  	}
  } catch(err){
    console.log(err);
    res.redirect('/error:sign-up-failed');
  }
});
//Inicio de sesion del usuario.
app.post('/login', passport.authenticate('local-login', {
  successRedirect: '/online',
  failureRedirect: '/error:incorrect-data',
}));

app.get('/error:incorrect-data', (req, res)=>{
  res.sendFile(__dirname+'/error:incorrect-data.html');
});

app.get('/online', isLoggedIn, async (req, res)=>{
  await client.query(`UPDATE users SET online=true WHERE username='${req.user}'`);
  res.redirect('/my-profile');
});

app.get('/logout', async (req, res)=>{
  await client.query(`UPDATE users SET online=false WHERE username='${req.user}'`);
  req.logout();
  res.redirect("/");
});
app.get('/my-profile', isLoggedIn, async (req, res)=>{
  //Consulto los datos del usuario (con clave) nombre, los combino con la plantilla de perfil de usuario y se lo envio.
  //Nota:Hacer una subrutina, asi puedo usarla tanto para ver el perfil del propio usuario como para ver un perfil ajeno.
  let plantilla=await rellenarPlantillaConDatos(__dirname+'/user-profile.html', req.user, true);
  res.send(plantilla);
});

app.get('/my-profile-photos', isLoggedIn, async (req, res)=>{
  try{
  	//Verifico que existe el usuario consultando su directorio.
    await fs.opendir(`users-photos/${req.user}`);
    //Cuento la cantidad de fotos que tiene el usuario en su directorio, y se retorna un array con las respectivas.
    let fotos=await fs.readdir(`users-photos/${req.user}`);
    //Ahora combino las fotos con la plantilla html.
    let plantilla=await fs.readFile(__dirname+'/photos.html', 'utf8');
    let fotoshtml='', fila='<tr>'; //La fila solo contendra 3 elementos(fotos). Cada vez que una fila se llena, se añade al relleno de la tabla y se crea otra nueva.
    let contadorDeFotos=1;
    let contenidoDeTabla='';
    for (let i=0; i<fotos.length; i++){
      if (i===fotos.length-1){
        fotoshtml+=`<td><div><img src="${req.user}/${fotos[i]}" id="${'photo'+i.toString()}">
        <div class="dropdown"><button class="btn btn-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
        ...</button>
        <ul class="dropdown-menu" id="${i.toString()}">
        <li><button class="dropdown-item">Seleccionar como foto de perfil</button></li>
        <li><button class="dropdown-item">Eliminar foto</button></li>
        </ul></div></div></td>`;
        fila+=fotoshtml+'</tr>';
        contenidoDeTabla+=fila;
      } else{
          if (contadorDeFotos===3){
            fotoshtml+=`<td><div><img src="${req.user}/${fotos[i]}" id="${'photo'+i.toString()}">
            <div class="dropdown"><button class="btn btn-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
            ...</button>
            <ul class="dropdown-menu" id="${i.toString()}">
            <li><button class="dropdown-item">Seleccionar como foto de perfil</button></li>
            <li><button class="dropdown-item">Eliminar foto</button></li>
            </ul></div></div></td>`;
            fila+=fotoshtml+'</tr>';
            contenidoDeTabla+=fila;
            fotoshtml='';
            fila='<tr>';
            contadorDeFotos=1;
          } else{
            fotoshtml+=`<td><div><img src="${req.user}/${fotos[i]}" id="${'photo'+i.toString()}">
            <div class="dropdown"><button class="btn btn-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
            ...</button>
            <ul class="dropdown-menu" id="${i.toString()}">
            <li><button class="dropdown-item">Seleccionar como foto de perfil</button></li>
            <li><button class="dropdown-item">Eliminar foto</button></li>
            </ul></div></div></td>`;
            contadorDeFotos++;
          }
      }
    }
    plantilla=plantilla.replace('<!--Fotos-->', contenidoDeTabla);
    res.send(plantilla);
  } catch(err){
  	/*Si hay un error, entonces probablemente el subdirectorio no exista y se tenga que crear el subdirectorio del usuario.
    Tengo mis dudas respecto a que solo puede ser que no exista, asi que probablemente tenga que usar otro bloque try-catch.
    Creo el directorio vuelvo a redirigir al usuario para que al menos vea su vista de fotos vacia (recursion).*/
  	await fs.mkdir(`users-photos/${req.user}`);
  	res.redirect('/my-profile-photos');
  }
});
app.post('/upload-photo', isLoggedIn, upload.single('photo'), async (req, res)=>{
  /*Me dirijo al directorio users-photos.
  Cada subdirectorio del mencionado directorio pertenece a un usuario de la aplicacion, y dentro de cada subdirectorio, se encuentran 
  almacenadas las fotos del correspondiente usuario.
  Los subdirectorios se nombran en funcion del username del usuario.
  Guardo la foto recibida en la carpeta correspondiente del usuario.
  */
  try{
    let fileHandle=await fs.opendir(`users-photos/${req.user}`);
  } catch(err){
  	throw err;
  } finally{
  	//Instruccion que permite mover la foto desde el directorio users-photos hacia el subdirectorio del usuario...
    await fs.rename(`users-photos/${req.file.filename}`, `users-photos/${req.user}/${req.file.filename}`);
  	res.json({url: '/my-profile-photos'});
  }
});
app.delete('/photos', isLoggedIn, async (req, res)=>{
  try{
    await fs.unlink(`./users-photos/${req.user}/${req.body.foto}`);
    res.json({message: "/my-profile-photos"}); //Para redirigir al usuario.
    //res.redirect('my-photos');
  } catch(err){
    res.json({message: "Operacion fallida, intentelo de nuevo."});
  }
});
app.put('/change-profile-photo', isLoggedIn, async (req, res)=>{
  try{
  	const etiquetaFotoDePerfil='etiquetaFotoDePerfilxxxxx';
  	let fileHandle=await fs.opendir(`users-photos/${req.user}`);
  	let fotosDelUsuario=await fs.readdir(`users-photos/${req.user}`);
  	//Si hay una foto de perfil establecida, entonces le quito su etiqueta, para ponersela a la nueva foto elegida.
  	let i=0, flag=false;
  	while (i<fotosDelUsuario.length && !flag){
  	  if (fotosDelUsuario[i].includes(etiquetaFotoDePerfil)){ //El metodo includes devuelve true si encuentra una subcadena dentro de una cadena, false en caso contrario.
  	    await fs.rename(`users-photos/${req.user}/${fotosDelUsuario[i]}`, `users-photos/${req.user}/${fotosDelUsuario[i].replace(etiquetaFotoDePerfil, '')}`);
  	    flag=true;
  	  }
  	  i++;
  	}
  	await fs.rename(`users-photos/${req.user}/${req.body.src}`, `users-photos/${req.user}/${req.body.src+etiquetaFotoDePerfil}`);
  	await fileHandle.close();
    res.json({message: 'Foto de perfil cambiada!'});
  } catch(err){
    res.json({message: 'Error en la operacion!'});
  }
});

app.get('/edit-profile', isLoggedIn, (req, res)=>{
  //Envio una nueva plantilla con los datos del usuario organizados para que el los pueda actualizar.
    res.sendFile(__dirname+'/edit-profile.html');
});
app.put('/edit-profile', isLoggedIn, async (req, res)=>{
  try{
  	let consulta=`UPDATE users SET header='${req.body.encabezado}', bodytype='${req.body.tipoDeCuerpo}', heigth='${req.body.altura}',
  	 ethnicgroup='${req.body.grupoEtnico}', maritalstatus='${req.body.estadoCivil}', sons='${req.body.hijos}', housingsituation='${req.body.
  	 situacionDeVivienda}', educationallevel='${req.body.nivelDeEstudios}', work='${req.body.trabaja}', smokes='${req.body.fuma}', drink='${req.body.bebe}',
  	 description='${req.body.descripcion}' WHERE username='${req.user}'`;
    await client.query(consulta);
    res.json({message:'Actualizacion exitosa'});
  } catch(err){
  	res.json({message:'Error, intentelo de nuevo.'});
  	throw err; 
  	}
});

app.get('/search', (req, res)=>{
  //Envio junto con todos los usuarios registrados. Luego el usuario decide sus parametros de busqueda.
  res.sendFile(__dirname+'/search.html');
});

function colocarCirculoOnline(online){
  if (online){
    return '<div id="online-circle"></div>';
  }
  return '';
}

app.get('/users', async (req, res)=>{
   /*Consulto el sexo del usuario para luego consultar todos los usuarios del sexo opuesto.
  Los mostrare en filas de 3. Cada perfil de usuario tendra como presentacion su banderita, estado, foto de perfil (avatar si no la tiene),
  su nombre de usuario y su edad. Si el usuario hace click en alguno de los perfiles, ira directamente al perfil indicado con todos 
  sus datos. Los parametros de busqueda seran el rango de edad, el pais y si estan online. En caso de que sean todos los paises,
  no incluyo eso  parametro en la consulta a la base de datos.
  Cada perfil sera un link en si mismo (a href) y lo unire junto a un parametro(en este caso el nombre de usuario) para que el usuario
  solicitante pueda ver el respectivo perfil...*/
  let sexo=await client.query(`SELECT sex FROM users WHERE username='${req.user}'`), perfilesDeUsuarios;
  if (req.query.pais==='Todos los paises'){
  	if (req.query.online!==undefined){
      perfilesDeUsuarios=await client.query(`SELECT * FROM users WHERE sex='${!sexo.rows[0].sex}' AND age<='${req.query.edad}' AND online=true`);
  	} else{
  	  perfilesDeUsuarios=await client.query(`SELECT * FROM users WHERE sex='${!sexo.rows[0].sex}' AND age<='${req.query.edad}'`);
  	}
  } else{
  	  if (req.query.online!==undefined){
  	  	onlineCircle='<div id="online-circle"></div>';
  	    perfilesDeUsuarios=await client.query(`SELECT * FROM users WHERE sex='${!sexo.rows[0].sex}' AND age<='${req.query.edad}'
        AND country='${req.query.pais}' AND online=true`);
  	  } else{
  	  	perfilesDeUsuarios=await client.query(`SELECT * FROM users WHERE sex='${!sexo.rows[0].sex}' AND age<='${req.query.edad}'
        AND country='${req.query.pais}'`);
  	  }
  }
  let plantilla=await fs.readFile(__dirname+'/search.html', 'utf8');
  let fila=`<tr>`, datos='', contador=0;
  for (let i=0; i<perfilesDeUsuarios.rows.length; i++){
  	let srcFotoDePerfil=await obtenerFotoPefilUsuario(perfilesDeUsuarios.rows[i].username);
    if (i===perfilesDeUsuarios.rows.length-1){
      fila+=`<td><a href="/user-profile?userName=${perfilesDeUsuarios.rows[i].username}"><img src="${srcFotoDePerfil}">${colocarCirculoOnline(perfilesDeUsuarios.rows[i].online)}<p>${perfilesDeUsuarios.rows[i].country}</p><p>${perfilesDeUsuarios.rows[i].username}</p>
      <p>${perfilesDeUsuarios.rows[i].age}</p></a></td>`;
      fila+='</tr>';
      datos+=fila;
    } else if(contador===3){
      contador=0;
      fila+='</tr>';
      datos+=fila;
      fila=`<tr>`;
      fila+=`<td><a href="/user-profile?userName=${perfilesDeUsuarios.rows[i].username}"><img src="${srcFotoDePerfil}">${colocarCirculoOnline(perfilesDeUsuarios.rows[i].online)}<p>${perfilesDeUsuarios.rows[i].country}</p><p>${perfilesDeUsuarios.rows[i].username}</p>
      <p>${perfilesDeUsuarios.rows[i].age}</p></a></td>`;
      contador++;
    } else{
      fila+=`<td><a href="/user-profile?userName=${perfilesDeUsuarios.rows[i].username}"><img src="${srcFotoDePerfil}">${colocarCirculoOnline(perfilesDeUsuarios.rows[i].online)}<p>${perfilesDeUsuarios.rows[i].country}</p><p>${perfilesDeUsuarios.rows[i].username}</p>
      <p>${perfilesDeUsuarios.rows[i].age}</p></a></td>`;
      contador++;
    }
  }
  plantilla=plantilla.replace('<!--Perfiles de usuarios-->', datos);
  res.send(plantilla);
});
app.get('/user-profile', async (req, res)=>{
  /*Cuando un usuario que haya inciado sesion quiera visitar el perfil de otro usuario registrado, este 
    sera el codigo que manejara esa peticion.
    Lo que hace es sencillo.
    Se recibe como parametro el nombre del usuario asociado al perfil (en este caso como req.query.userName).
    Luego, se consulta en la base de datos los datos de ese usuario.
    Los datos de ese usuario se combinan con la plantilla del perfil del usuario solcitado.
    Por ultimo, se envia la plantilla al usuario que hizo la solicitud, mostrandole el perfil correspondiente.*/
    let plantilla=await rellenarPlantillaConDatos(__dirname+'/user-profile.html', req.query.userName, false);
    res.send(plantilla);
});
app.get('/other-user-profile-photos', async (req, res)=>{
  /*Las fotos del usuario consultado se muestran al usuario solicitante. Esta consulta se hace desde el perfil
  del usuario consultado*/
  try{
  	//Verifico que existe el usuario consultando su directorio.
    await fs.opendir(`users-photos/${req.query.userName}`);
    //Cuento la cantidad de fotos que tiene el usuario en su directorio, y se retorna un array con las respectivas.
    let fotos=await fs.readdir(`users-photos/${req.query.userName}`);
    //Ahora combino las fotos con la plantilla html.
    let plantilla=await fs.readFile(__dirname+'/photos.html', 'utf8');
    let fotoshtml='', fila='<tr>'; //La fila solo contendra 3 elementos(fotos). Cada vez que una fila se llena, se añade al relleno de la tabla y se crea otra nueva.
    let contadorDeFotos=1;
    let contenidoDeTabla='';
    for (let i=0; i<fotos.length; i++){
      if (i===fotos.length-1){
        fotoshtml+=`<td><img src="${req.query.userName}/${fotos[i]}"></td>`;
        fila+=fotoshtml+'</tr>';
        contenidoDeTabla+=fila;
      } else{
          if (contadorDeFotos===3){
            fotoshtml+=`<td><img src="${req.query.userName}/${fotos[i]}"></td>`;
            fila+=fotoshtml+'</tr>';
            contenidoDeTabla+=fila;
            fotoshtml='';
            fila='<tr>';
            contadorDeFotos=1;
          } else{
            fotoshtml+=`<td><img src="${req.query.userName}/${fotos[i]}"></td>`;
            contadorDeFotos++;
          }
      }
    }
    plantilla=plantilla.replace('<!--Fotos-->', contenidoDeTabla);
    res.send(plantilla);
  } catch(err){
  	res.json(`Ha ocurrido un error al visualizar las fotos del usuario ${req.query.userName}`);
  }
});

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
function getUsernameFromMsg(message){
  let i=0, username='';
  while(message[i]!==':'){
    username+=message[i];
    i++;
  }
  return username;
}
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

app.get('/change-password', isLoggedIn, (req, res)=>{
  res.sendFile(__dirname+'/change-password.html');
});

app.put('/change-password', isLoggedIn, (req, res)=>{
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