const fs=require('fs').promises;
let htmlFilePath=__dirname.replace('/routes', ''); htmlFilePath=htmlFilePath.replace('/modules', '');
exports.photos=async (req, res)=>{
  /*Las fotos del usuario consultado se muestran al usuario solicitante. Esta consulta se hace desde el perfil
  del usuario consultado*/
  try{
  	//Verifico que existe el usuario consultando su directorio.
    await fs.opendir(`users-photos/${req.query.userName}`);
    //Cuento la cantidad de fotos que tiene el usuario en su directorio, y se retorna un array con las respectivas.
    let fotos=await fs.readdir(`users-photos/${req.query.userName}`);
    //Ahora combino las fotos con la plantilla html.
    let plantilla=await fs.readFile(htmlFilePath+'/photos.html', 'utf8');
    let fotoshtml='', fila='<tr>'; //La fila solo contendra 3 elementos(fotos). Cada vez que una fila se llena, se añade al relleno de la tabla y se crea otra nueva.
    let contadorDeFotos=1;
    let contenidoDeTabla='';
    for (let i=0; i<fotos.length; i++){
      if (i===fotos.length-1){
        fotoshtml+=`<td><img src="/${req.query.userName}/${fotos[i]}"></td>`;
        fila+=fotoshtml+'</tr>';
        contenidoDeTabla+=fila;
      } else{
          if (contadorDeFotos===3){
            fotoshtml+=`<td><img src="/${req.query.userName}/${fotos[i]}"></td>`;
            fila+=fotoshtml+'</tr>';
            contenidoDeTabla+=fila;
            fotoshtml='';
            fila='<tr>';
            contadorDeFotos=1;
          } else{
            fotoshtml+=`<td><img src="/${req.query.userName}/${fotos[i]}"></td>`;
            contadorDeFotos++;
          }
      }
    }
    plantilla=plantilla.replace('<!--Fotos-->', contenidoDeTabla);
    res.send(plantilla);
  } catch(err){
  	res.json(`Ha ocurrido un error al visualizar las fotos del usuario ${req.query.userName}`);
  }
}