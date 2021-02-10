const express=require('express');
const router=express.Router();
const logged=require('./modules/isLoggedIn.js');
const chat_interface=require('./modules/chat-interface.js');
const chat=require('./modules/chat-between-users.js');
router.get('/', logged.isLoggedIn, chat_interface.chatInterface);
router.get('/chat', logged.isLoggedIn, chat.chatBetweenUsers);
module.exports=router;