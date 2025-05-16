const mongoose=require('mongoose');

const postSchema=new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    content:{
        type:String,
        required:true
    },
    date:{
        type:Date,
        default:Date.now
    },
    username:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    likes:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'User'
        }
    ]
})

module.exports=mongoose.model('Post',postSchema);