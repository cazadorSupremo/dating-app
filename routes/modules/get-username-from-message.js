exports.getUsernameFromMsg=(message)=>{
  let i=0, username='';
  while(message[i]!==':'){
    username+=message[i];
    i++;
  }
  return username;
}