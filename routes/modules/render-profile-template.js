const get_user_profile_picture=require('./get-user-profile-picture.js');
const paste_circle_online=require('./paste-circle-online.js');
const fs=require('fs').promises;
const {Client}=require('pg');
const client=new Client({
  user: 'postgres',
  database: 'postgres',
  password: '2020',
  host: 'localhost',   //Todos estos parametros, si no se declaran, se establecen por defecto (ver documentacion. En caso del host, el por defecto tambien es localhost, pero lo incluyo por inercia)
});
client.connect();
module.exports.renderProfileTemplate=async (templatePath, userID, requestingUser)=>{ /*El tercer parametro (tipo bool) de esta funcion
  definira si se generara el perfil del propio usuario solicitante o el perfil de otro usuario ajeno*/
  try{
  	/*Este codigo se encargara de generar el perfil del usuario.
     Nota:Ordenar los datos en la base de datos para reducir este codigo(refactorizar) a un bucle...*/
    //Primero me encargo de la foto de perfil:
    let srcProfilePhoto=await get_user_profile_picture.getUserProfilePicture(userID);
    //Luego de definir la foto de perfil del usuario, empiezo con los demas datos, para poder generar la template.
    let template=await fs.readFile(templatePath, 'utf8');
    /*En la consulta, verifico correo o usuario, porque cuando es el usuario, envia el idUsuario(su correo) y cuando el usuario
    consulta el perfil del otro usuario, se envia el nombre de usuario del perfil consultado, debo corregir esto 
    para que se estandarice como nada mas el nombre del usuario!*/
    if (requestingUser){
      template=template.replace('<!--Fotos del mismo o fotos de otro usuario-->', '<a href="/my-profile/photos">Fotos</a>');
      template=template.replace('<!--editar perfil o chat-->', '<a href="/my-profile/edit-profile">Editar perfil</a>');
    } else{
      template=template.replace('<!--Fotos del mismo o fotos de otro usuario-->', '<a id="photos" href="/search/users/user-profile/photos">Fotos</a>');
      template=template.replace('<!--editar perfil o chat-->', '<a id="chat" href="/chat-interface/chat">Mensaje</a>');
    }
    let result=await client.query(`SELECT * FROM users WHERE username='${userID}'`);
    template=template.replace('foto de perfil', srcProfilePhoto);
    template=template.replace('<!--online-->', paste_circle_online.pasteCircleOnline(result.rows[0].online));
    template=template.replace('Pais, Estado, Ciudad', result.rows[0].country);
    template=template.replace('Nombre de usuario', result.rows[0].username);
    let nameAndLastName=result.rows[0].name+' '+result.rows[0].lastname;
    template=template.replace('Nombre y Apellido', nameAndLastName);
    template=template.replace('Encabezado', result.rows[0].header===null? '' : result.rows[0].header);
    template=template.replace('valor', result.rows[0].heigth===null? '' : result.rows[0].heigth);
    template=template.replace('valor', result.rows[0].bodytype===null? '' : result.rows[0].bodytype);
    template=template.replace('valor', result.rows[0].ethnicgroup===null? '' : result.rows[0].ethnicgroup);
    template=template.replace('valor', result.rows[0].maritalstatus===null? '' : result.rows[0].maritalstatus);
    template=template.replace('valor', result.rows[0].sons? 'Yes' : 'No');
    template=template.replace('valor', result.rows[0].housingsituation===null? '' : result.rows[0].housingsituation); 
    template=template.replace('valor', result.rows[0].educationallevel===null? '' : result.rows[0].educationallevel);
    template=template.replace('valor', result.rows[0].work? 'Yes' : 'No');
    template=template.replace('valor', result.rows[0].smokes? 'Yes' : 'No');
    template=template.replace('valor', result.rows[0].drink? 'Yes' : 'No');
    template=template.replace('Descripcion', result.rows[0].description===null? '' : result.rows[0].description);
    return template;
  } catch(err){
  	return 'Error';
  }
}