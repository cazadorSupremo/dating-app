const express=require('express');
const app=express();
const port=8080; //En produccion seria el puerto 80
const path=require('path');
const session=require('express-session');
const passport=require('passport');
const LocalStrategy=require('passport-local').Strategy;
const fs=require('fs').promises;
const multer=require('multer');
const upload=multer({dest: 'users-photos'});
//const bcrypt=require('bcryptjs') //para hashear las contraseñas (usar bcrypt, basado en c++, ya que es mucho mas rapido)
const {Client}=require('pg');
const client=new Client({
  user: 'postgres',
  database: 'postgres',
  password: '2020',
  host: 'localhost',   //Todos estos parametros, si no se declaran, se establecen por defecto (ver documentacion. En caso del host, el por defecto tambien es localhost, pero lo incluyo por inercia)
});
client.connect();
app.use(session({ secret: "secret", resave: false, saveUninitialized: true })); //¿Porque cats?
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(express.static('imagenes'));
app.use(express.static('users-photos'));
app.use(passport.initialize());
//app.use(express.static('bootstrap')); //Luego averiguare como insertar estilos de boostrap...
passport.use('local-signin', new LocalStrategy(({
   usernameField: 'username',
   passwordField: 'password',
   passReqToCallback: true //Asi puedo pasar el objeto "req" a la funcion de autenticacion de passport, y acceder todos los datos del formulario.
 }), async (req, username, password, done)=>{
  if (req.body.sex==='man'){
    req.body.sex=1;
  } else {
  	req.body.sex=0;
  }
  try{
    let registroDeNuevoUsuario=`INSERT INTO users (email, password, username, name, lastName, sex, age, country) values('${req.body.email}', '${password}', 
    '${username}', '${req.body.name}', '${req.body.lastName}', '${req.body.sex}', '${req.body.age}', '${req.body.country}')`;
    await client.query(registroDeNuevoUsuario);
    let newUser={
      username: username,
      password: password,
      id: req.body.email,
      name: req.body.name,
      lastName: req.body.lastName,
    }
    console.log('Nuevo usuario registrado');
    return done(null, newUser);
  } catch(err){
    console.log('Error en el registro del nuevo usuario.');
    return done(err);
  } /*finally{
    client.end();
  }*/
}));
passport.use('local-login', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
  }, async (username, password, done)=>{
     try{
       let consultaDeUsuario=await client.query(`SELECT * FROM users WHERE email='${username}' AND password='${password}'`);
       if (consultaDeUsuario.rows.length===1){
         let newUser={id: username};
         return done(null, newUser);
       } else{
         return done(null, {message: 'Usuario no existe!'});
       }
     } catch(err){
       console.log('Error en el inicio de sesion del usuario.');
       return done(err);
     } /*finally{
       client.end();
     }*/
}));
passport.serializeUser((user, done)=>{
  return done(null, user.id);
});
passport.deserializeUser(async (id, done)=>{
  try{
    let consultaIdDeUsuario=await client.query(`SELECT * FROM users WHERE email='${id}'`);
    if (consultaIdDeUsuario.rows.length===1){
      return done(false, id); //Si esta el usuario, por lo que error valdra false
    } else{
      return done(true, id);
    }
  } catch(err){
    console.log('Error en la desearilizacion del usuario.');
    return done(err, id);
  } /*finally{
    client.end();
  }*/
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
  let sexo=await client.query(`SELECT sex FROM users WHERE email='${username}' OR username='${username}'`), avatar;
  if (sexo.rows[0].sex){
    avatar='avatares-por-defecto/male.jpg';
  } else{
    avatar='avatares-por-defecto/female.jpeg';
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
async function rellenarPlantillaConDatos(rutaDePlantilla, idUsuario, response){
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
    let result=await client.query(`SELECT * FROM users WHERE email='${idUsuario}' OR username='${idUsuario}'`);
    plantilla=plantilla.replace('foto de perfil', srcFotoDePerfil);
    plantilla=plantilla.replace('Pais, Estado, Ciudad', result.rows[0].country); //Por ahora solo estoy usando el pais...
    plantilla=plantilla.replace('Nombre de usuario', result.rows[0].username);
    let nameAndLastName=result.rows[0].name+' '+result.rows[0].lastname;
    plantilla=plantilla.replace('Nombre y Apellido', nameAndLastName);
    plantilla=plantilla.replace('Encabezado', result.rows[0].header);
    plantilla=plantilla.replace('valor', result.rows[0].heigth);
    plantilla=plantilla.replace('valor', result.rows[0].bodytype);
    plantilla=plantilla.replace('valor', result.rows[0].ethnicgroup);
    plantilla=plantilla.replace('valor', result.rows[0].maritalstatus);
    plantilla=plantilla.replace('valor', result.rows[0].sons);
    plantilla=plantilla.replace('valor', result.rows[0].housingsituation); //Por alguna razon, postgresql no guarda caracteres del tipo "minusculaMayuscula"
    plantilla=plantilla.replace('valor', result.rows[0].educationallevel);
    plantilla=plantilla.replace('valor', result.rows[0].work);
    plantilla=plantilla.replace('valor', result.rows[0].smokes);
    plantilla=plantilla.replace('valor', result.rows[0].drink);
    plantilla=plantilla.replace('Descripcion', result.rows[0].description);
    //Faltan mas datos, pero por ahora me serviran de prueba.
    response.send(plantilla);
    return response.end();
  } catch(err){
  	return 'Error en la operacion';
  }
}
//app.use(passport.initialize());
app.get('/', (req, res)=>{
  if (req.isAuthenticated()){
    res.redirect('/myProfile');
  } else{
    res.sendFile('/home/freddy/Escritorio/mvp-citas-cougarsAndMilf/index.html');
  }
});
app.get('/registro', (req, res)=>{
  res.sendFile('/home/freddy/Escritorio/mvp-citas-cougarsAndMilf/registro.html');
});
app.post('/signin', passport.authenticate('local-signin', {
    successRedirect: "/",
    failureRedirect: "/registro"
  })
);
//Inicio de sesion del usuario.
app.post('/login', passport.authenticate('local-login', {
  successRedirect: '/myProfile',
  failureRedirect: '/'
}));
app.get('/log-out', (req, res) => {
  req.logout();
  res.redirect("/");
});
app.get('/myProfile', isLoggedIn, (req, res)=>{
  //Consulto los datos del usuario (con clave) nombre, los combino con la plantilla de perfil de usuario y se lo envio.
  //Nota:Hacer una subrutina, asi puedo usarla tanto para ver el perfil del propio usuario como para ver un perfil ajeno.
  rellenarPlantillaConDatos('/home/freddy/Escritorio/mvp-citas-cougarsAndMilf/perfilDeUsuario.html', req.user, res);
});

app.get('/my-photos', isLoggedIn, async (req, res)=>{
  try{
  	//Verifico que existe el usuario consultando su directorio.
    let fileHandle=await fs.opendir(`users-photos/${req.user}`);
    //Cuento la cantidad de fotos que tiene el usuario en su directorio, y se retorna un array con las respectivas.
    let fotos=await fs.readdir(`users-photos/${req.user}`);
    //Ahora combino las fotos con la plantilla html.
    let plantilla=await fs.readFile('/home/freddy/Escritorio/mvp-citas-cougarsAndMilf/photos.html', 'utf8');
    let fotoshtml='', fila='<tr>'; //La fila solo contendra 3 elementos(fotos). Cada vez que una fila se llena, se añade al relleno de la tabla y se crea otra nueva.
    let contadorDeFotos=1;
    let contenidoDeTabla='';
    for (let i=0; i<fotos.length; i++){
      if (i===fotos.length-1){
        fotoshtml+=`<td><img src="${req.user}/${fotos[i]}"></td>`;
        fila+=fotoshtml+'</tr>';
        contenidoDeTabla+=fila;
      } else{
          if (contadorDeFotos===3){
            fotoshtml+=`<td><img src="${req.user}/${fotos[i]}"></td>`;
            fila+=fotoshtml+'</tr>';
            contenidoDeTabla+=fila;
            fotoshtml='';
            fila='<tr>';
            contadorDeFotos=1;
          } else{
            fotoshtml+=`<td><img src="${req.user}/${fotos[i]}"></td>`;
            contadorDeFotos++;
          }
      }
    }
    await fileHandle.close(); //Cierro el directorio para que el recolector de basura no se haga cargo.
    plantilla=plantilla.replace('<!--Fotos-->', contenidoDeTabla);
    res.send(plantilla);
  } catch(err){
  	res.redirect('/myProfile');
  }
});
app.post('/uploadPhoto', isLoggedIn, upload.single('photo'), async (req, res)=>{
  /*Me dirijo al directorio users-photos.
  Cada subdirectorio del mencionado directorio pertenece a un usuario de la aplicacion, y dentro de cada subdirectorio, se encuentran 
  almacenadas las fotos del correspondiente usuario.
  Los subdirectorios se nombran en funcion del username del usuario (en este caso prototipo, el id del usuario (correo).
  Guardo la foto recibida en la carpeta correspondiente del usuario.
  */
  try{
    let fileHandle=await fs.opendir(`users-photos/${req.user}`);
  } catch(err){
    /*Si hay un error, entonces probablemente el subdirectorio no exista y se tenga que crear el subdirectorio del usuario.
    Tengo mis dudas respecto a que solo puede ser que no exista, asi que probablemente tenga que usar otro bloque try-catch.*/
    await fs.mkdir(`users-photos/${req.user}`);
  } finally{
  	//Instruccion permite mover la foto desde el directorio users-photos hacia el subdirectorio del usuario...
    await fs.rename(`users-photos/${req.file.filename}`, `users-photos/${req.user}/${req.file.filename}`);
    await fileHandle.close(); //Para no requerir el recolector de basura...
  	res.redirect('/my-photos');
  }
});
app.delete('/photos', isLoggedIn, async (req, res)=>{
  try{
    for (let i=0; i<req.body.fotos.length; i++){
      await fs.unlink(`./users-photos/${req.user}/${req.body.fotos[i]}`);
    }
    res.json({message: "Operacion exitosa!"}); //Esto seria optimo si estuviera usando un enfoque de SPA...Asi no tendria que redirigir.
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
    res.sendFile('/home/freddy/Escritorio/mvp-citas-cougarsAndMilf/editarPerfil.html');
});
app.put('/edit-profile', isLoggedIn, async (req, res)=>{
  try{
  	let consulta=`UPDATE users SET header='${req.body.encabezado}', bodyType='${req.body.tipoDeCuerpo}', heigth='${req.body.altura}',
  	 ethnicGroup='${req.body.grupoEtnico}', maritalStatus='${req.body.estadoCivil}', sons='${req.body.hijos}', housingSituation='${req.body.
  	 situacionDeVivienda}', educationalLevel='${req.body.nivelDeEstudios}', work='${req.body.trabajas}', smokes='${req.body.fuma}', drink='${req.body.bebe}',
  	 description='${req.body.descripcion}' WHERE email='${req.user}'`;
    await client.query(consulta);
    res.json({message:'Actualizacion exitosa'});
  } catch(err){
  	res.json({message:'Error, intentelo de nuevo.'});
  	throw err; 
  	}
});

app.get('/search', (req, res)=>{
  //Envio junto con todos los usuarios registrados. Luego el usuario decide sus parametros de busqueda.
  res.sendFile('/home/freddy/Escritorio/mvp-citas-cougarsAndMilf/search.html');
});
app.get('/users', async (req, res)=>{ 
   /*Consulto el sexo del usuario para luego consultar todos los usuarios del sexo opuesto.
  Los mostrare en filas de 3. Cada perfil de usuario tendra como presentacion su banderita, estado, foto de perfil (avatar si no la tiene),
  su nombre de usuario y su edad. Si el usuario hace click en alguno de los perfiles, ira directamente al perfil indicado con todos 
  sus datos. Los parametros de busqueda seran el rango de edad, el pais y si estan online. En caso de que sean todos los paises,
  no incluyo eso  parametro en la consulta a la base de datos.
  Cada perfil sera un link en si mismo (a href) y lo unire junto a un parametro(en este caso el nombre de usuario) para que el usuario
  solicitante pueda ver el respectivo perfil...*/
  let sexo=await client.query(`SELECT sex FROM users WHERE email='${req.user}'`), perfilesDeUsuarios;
  if (req.query.pais==='Todos los paises'){
    perfilesDeUsuarios=await client.query(`SELECT * FROM users WHERE sex='${!sexo.rows[0].sex}' AND age<='${req.query.edad}'`);
  } else{
    perfilesDeUsuarios=await client.query(`SELECT * FROM users WHERE sex='${!sexo.rows[0].sex}' AND age<='${req.query.edad}'
    AND country='${req.query.pais}'`);
  }
  let plantilla=await fs.readFile('/home/freddy/Escritorio/mvp-citas-cougarsAndMilf/search.html', 'utf8');
  let fila=`<tr>`, datos='', contador=0;
  for (let i=0; i<perfilesDeUsuarios.rows.length; i++){
  	let srcFotoDePerfil=await obtenerFotoPefilUsuario(perfilesDeUsuarios.rows[i].email);
    if (i===perfilesDeUsuarios.rows.length-1){
      fila+=`<td><a href="/userProfile?userName=${perfilesDeUsuarios.rows[i].username}"><img src="${srcFotoDePerfil}"><p>${perfilesDeUsuarios.rows[i].country}</p><p>${perfilesDeUsuarios.rows[i].username}</p>
      <p>${perfilesDeUsuarios.rows[i].age}</p></a></td>`;
      fila+='</tr>';
      datos+=fila;
    } else if(contador===2){
      contador=0;
      fila+='</tr>';
      datos+=fila;
      fila=`<tr>`;
      fila+=`<td><a href="/userProfile?userName=${perfilesDeUsuarios.rows[i].username}"><img src="${srcFotoDePerfil}"><p>${perfilesDeUsuarios.rows[i].country}</p><p>${perfilesDeUsuarios.rows[i].username}</p>
      <p>${perfilesDeUsuarios.rows[i].age}</p></a></td>`;
      contador++;
    } else{
      fila+=`<td><a href="/userProfile?userName=${perfilesDeUsuarios.rows[i].username}"><img src="${srcFotoDePerfil}"><p>${perfilesDeUsuarios.rows[i].country}</p><p>${perfilesDeUsuarios.rows[i].username}</p>
      <p>${perfilesDeUsuarios.rows[i].age}</p></a></td>`;
      contador++;
    }
  }
  plantilla=plantilla.replace('<!--Perfiles de usuarios-->', datos);
  res.send(plantilla);
});
app.get('/userProfile', (req, res)=>{
  /*Cuando un usuario que haya inciado sesion quiera visitar el perfil de otro usuario registrado, este 
    sera el codigo que manejara esa peticion.
    Lo que hace es sencillo.
    Se recibe como parametro el nombre del usuario asociado al perfil (en este caso como req.query.userName).
    Luego, se consulta en la base de datos los datos de ese usuario.
    Los datos de ese usuario se combinan con la plantilla del perfil del usuario solcitado.
    Por ultimo, se envia la plantilla al usuario que hizo la solicitud, mostrandole el perfil correspondiente.*/
    rellenarPlantillaConDatos('/home/freddy/Escritorio/mvp-citas-cougarsAndMilf/perfilDeUsuario.html', req.query.userName, res);
});
app.get('/userProfilePhotos', isLoggedIn, (req, res)=>{
  /*Las fotos del usuario consultado se muestran al usuario solicitante. Esta consulta se hace desde el perfil
  del usuario consultado*/
});

app.listen(port, ()=>{
  console.log('Aplicacion iniciada!');
});