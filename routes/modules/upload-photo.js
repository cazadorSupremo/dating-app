const fs=require('fs').promises;
const multer=require('multer');
const upload=multer({dest: 'users-photos'});
exports.multer=upload.single('photo');
exports.uploadPhoto=async (req, res)=>{
  /*Me dirijo al directorio users-photos.
  Cada subdirectorio del mencionado directorio pertenece a un usuario de la aplicacion, y dentro de cada subdirectorio, se encuentran 
  almacenadas las fotos del correspondiente usuario.
  Los subdirectorios se nombran en funcion del username del usuario.
  Guardo la foto recibida en la carpeta correspondiente del usuario.
  */
  try{
    await fs.opendir(`users-photos/${req.user}`);
  } catch(err){
  	throw err;
  } finally{
  	//Instruccion que permite mover la foto desde el directorio users-photos hacia el subdirectorio del usuario...
    await fs.rename(`users-photos/${req.file.filename}`, `users-photos/${req.user}/${req.file.filename}`);
  	res.json({url: '/my-profile/photos'});
  }
}