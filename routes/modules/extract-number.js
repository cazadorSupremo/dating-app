exports.extractNumber=(line)=>{
  let number='';
  for (let i=0; i<line.length; i++){
    switch(line[i]){
      case '0': case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': case'9':
        number+=line[i];
      break;
    }
  }
  return number;
}