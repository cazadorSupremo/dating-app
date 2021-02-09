const fs=require('fs').promises;
exports.deletePhoto=async (req, res)=>{
  try{
    await fs.unlink(`./users-photos/${req.user}/${req.body.foto}`);
    res.json({message: "/my-profile/photos"}); //Para redirigir al usuario.
    //res.redirect('my-photos');
  } catch(err){
    res.json({message: "Operacion fallida, intentelo de nuevo."});
  }
}