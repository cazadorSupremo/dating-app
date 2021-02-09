const fs=require('fs').promises;
const {Client}=require('pg');
const client=new Client({
  user: 'postgres',
  database: 'postgres',
  password: '2020',
  host: 'localhost',   //Todos estos parametros, si no se declaran, se establecen por defecto (ver documentacion. En caso del host, el por defecto tambien es localhost, pero lo incluyo por inercia)
});
client.connect();

module.exports.getUserProfilePicture=async(username)=>{
  /*En la consulta, verifico correo o usuario, porque cuando es el usuario, envia el idUsuario(su correo) y cuando el usuario
   consulta el perfil del otro usuario, se envia el nombre de usuario del perfil consultado, debo corregir esto 
   para que se estandarice como nada mas el nombre del usuario!*/
  let sexo=await client.query(`SELECT sex FROM users WHERE username='${username}'`), avatar;
  if (sexo.rows[0].sex){
    avatar='/default-avatars/male.jpeg';
  } else{
    avatar='/default-avatars/female.jpeg';
  }
  const profilePictureTag='etiquetaFotoDePerfilxxxxx';
  let srcProfilePhoto='', photos;
  try{
    await fs.opendir(`users-photos/${username}`);
    photos=await fs.readdir(`users-photos/${username}`);
  } catch(err){
    photos=[];
  }
  if (photos.length===0){
    srcProfilePhoto=avatar; 
  } else{
      let i=0, flag=false;
      while (i<photos.length && !flag){
        if (photos[i].includes(profilePictureTag)){
          srcProfilePhoto=`/${username}/${photos[i]}`;
          flag=true;
        }
        i++;
      }
      if (!flag){
        srcProfilePhoto=avatar;
      }
  }
  return srcProfilePhoto;
}
