const express=require('express');
const router=express.Router();
const htmlFilePath=__dirname.replace('/routes', '');
const render_profile_template=require('./modules/render-profile-template.js');
const logged=require('./modules/isLoggedIn.js');
const profile_photos=require('./modules/profile-photos.js');
const upload_photo=require('./modules/upload-photo.js');
const delete_photo=require('./modules/delete-photo.js');
const change_profile_photo=require('./modules/change-profile-photo.js');
const edit_profile=require('./modules/edit-profile.js');
router.get('/', async (req, res)=>{ //como segundo parametro debe tener la funcion isLoggedIn
  //Consulto los datos del usuario (con clave) nombre, los combino con la plantilla de perfil de usuario y se lo envio.
  //Nota:Hacer una subrutina, asi puedo usarla tanto para ver el perfil del propio usuario como para ver un perfil ajeno.
  let template=await render_profile_template.renderProfileTemplate(htmlFilePath+'/user-profile.html', req.user, true);
  res.send(template);
});

router.get('/photos', logged.isLoggedIn, async (req, res)=>{
  let template=await profile_photos.profilePhotos(req.user);
  if (template!==''){
    res.send(template);
  } else{
    res.redirect('/my-profile/photos');
  }
});

router.post('/photos/upload-photo', logged.isLoggedIn, upload_photo.multer, upload_photo.uploadPhoto); 

router.delete('/photos', logged.isLoggedIn, delete_photo.deletePhoto);

router.put('/photos/change-profile-photo', logged.isLoggedIn, change_profile_photo.changeProfilePhoto);

router.get('/edit-profile', logged.isLoggedIn, (req, res)=>{
  res.sendFile(htmlFilePath+'/edit-profile.html');
});

router.put('/edit-profile', logged.isLoggedIn, edit_profile.editProfile);

module.exports=router;