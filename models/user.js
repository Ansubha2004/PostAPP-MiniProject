const mongoose=require('mongoose');
const dotenv=require('dotenv');
require("dotenv").config();

mongoose.connect(process.env.MONGODB);

const userSchema= new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    username:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    mobile:{
        type:Number,
        required:true
    },
    password:{
        type:String,
        required:true,
        unique:true
    },
    posts:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Post'
        }
    ]

})


module.exports= mongoose.model('User',userSchema);