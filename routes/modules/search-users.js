const {Client}=require('pg');
const client=new Client({
  user: 'postgres',
  database: 'postgres',
  password: '2020',
  host: 'localhost',   //Todos estos parametros, si no se declaran, se establecen por defecto (ver documentacion. En caso del host, el por defecto tambien es localhost, pero lo incluyo por inercia)
});
client.connect();
let htmlFilePath=__dirname.replace('/routes', ''); htmlFilePath=htmlFilePath.replace('/modules', '');
const fs=require('fs').promises;
const getProfilePhoto=require('./get-user-profile-picture.js');
const onlineCircle=require('./paste-circle-online.js');

exports.searchUsers=async (req, res)=>{
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
  let plantilla=await fs.readFile(htmlFilePath+'/search.html', 'utf8');
  let fila=`<tr>`, datos='', contador=0;
  for (let i=0; i<perfilesDeUsuarios.rows.length; i++){
  	let srcFotoDePerfil=await getProfilePhoto.getUserProfilePicture(perfilesDeUsuarios.rows[i].username);
    if (i===perfilesDeUsuarios.rows.length-1){
      fila+=`<td><a href="/search/users/user-profile?userName=${perfilesDeUsuarios.rows[i].username}"><img src="${srcFotoDePerfil}">${onlineCircle.pasteCircleOnline(perfilesDeUsuarios.rows[i].online)}<p>${perfilesDeUsuarios.rows[i].country}</p><p>${perfilesDeUsuarios.rows[i].username}</p>
      <p>${perfilesDeUsuarios.rows[i].age}</p></a></td>`;
      fila+='</tr>';
      datos+=fila;
    } else if(contador===3){
      contador=0;
      fila+='</tr>';
      datos+=fila;
      fila=`<tr>`;
      fila+=`<td><a href="/search/users/user-profile?userName=${perfilesDeUsuarios.rows[i].username}"><img src="${srcFotoDePerfil}">${onlineCircle.pasteCircleOnline(perfilesDeUsuarios.rows[i].online)}<p>${perfilesDeUsuarios.rows[i].country}</p><p>${perfilesDeUsuarios.rows[i].username}</p>
      <p>${perfilesDeUsuarios.rows[i].age}</p></a></td>`;
      contador++;
    } else{
      fila+=`<td><a href="/search/users/user-profile?userName=${perfilesDeUsuarios.rows[i].username}"><img src="${srcFotoDePerfil}">${onlineCircle.pasteCircleOnline(perfilesDeUsuarios.rows[i].online)}<p>${perfilesDeUsuarios.rows[i].country}</p><p>${perfilesDeUsuarios.rows[i].username}</p>
      <p>${perfilesDeUsuarios.rows[i].age}</p></a></td>`;
      contador++;
    }
  }
  plantilla=plantilla.replace('<!--Perfiles de usuarios-->', datos);
  res.send(plantilla);
}