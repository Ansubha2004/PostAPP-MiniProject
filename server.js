const express= require('express');
const app=express();
const path=require('path');
const bcrypt=require('bcrypt');
const cookieParser=require('cookie-parser');
const jwt=require('jsonwebtoken');
const ejs=require('ejs');
const usermodel=require('./models/user');
const postmodel=require('./models/post');
const isLoggedIn=require('./middleware/isLoggedIn');
const dotenv=require('dotenv');
require('dotenv').config();
const sendmail=require('./utility/mail');

app.use(cookieParser());
app.use(express.urlencoded({extended:true}));   
app.use(express.static(path.join(__dirname,'public')));
app.use(express.json());
app.set('view engine','ejs');



//register page rendering
app.get('/',(req,res)=>{
    res.render('register');
})

//register page backend 
app.post('/register', async (req,res)=>{
    try{
        const {name,username,email,mobile,password}=req.body;
        //encryption
        bcrypt.hash(password,10, async (err,hash)=>{
            if(err){
                console.log(err);
                return res.status(500).send("Error hashing password");
            }
            //check all fields present or not
            if(!name || !username || !email || !mobile || !password){
                return res.status(400).send("Please fill all the fields");
            }
            //check if already mail exists?
            const checkmail=await usermodel.findOne({email:email});
            if(checkmail){
                return res.status(400).send("Email already exists");
            }
            const createuser=await usermodel.create({
                name:name,
                username:username,
                email:email,
                mobile:mobile,
                password:hash
            })
            console.log("Registered user details: ",createuser) ;

            //token generation-cookie
            const token=jwt.sign({email,userid:createuser._id},process.env.SECRETKEY);
            res.cookie('Token',token);
            console.log("Token created successfully",token);

            //send mail
            await sendmail(email,"Congrates "+name+"! Registration Successful ","Hi "+name+",\n\n\nThank you for registering with POST BOARD. Your account has been successfully created. You can now log in using your email and password. If you did not initiate this registration, please contact us immediately. \n\n\nBest regards,\nTeam Post Board");

            res.redirect('/login');
        })

    }
    catch(err){
        console.log(err);
    }
})

//login 
app.get('/login',(req, res) => {
    res.render('login');
});

//login backend
app.post('/login', async (req,res)=>{
    try{
        const {email,password}=req.body;
        //check if email and password is present\
        if(!email || !password){
            return res.status(500).send("Please fill all the fields");
        }
        //check if email exists                                             
        const finddata=await usermodel.findOne({email:email});
        if(!finddata){
            return res.status(400).send("Data not found");
        }
        bcrypt.compare(password,finddata.password, (err,result)=>{
            if(err){
                console.log(err);
                return res.status(500).send("Error comparing password");
            }
            if(result)
            {
                //token generation-cookie
                const token=jwt.sign({email,userid:finddata._id},process.env.SECRETKEY);
                res.cookie('Token',token);
                console.log("Token created successfully",token);

                //send mail
                sendmail(email,"Congrates "+finddata.name+"! Log In Successful ","Hey "+finddata.name+",\n\n\nYour have successfully logged in to your account: "+finddata.username+". If you did not initiate this login, please contact us immediately. \n\n\nBest regards,\nTeam Post Board");


                res.redirect("/profile");
            }
            else
            {
                return res.status(400).redirect("/login");
            }
        })

    }
    catch(error)
    {
        console.log(error); 

    }
})



//logout
app.get('/logout',isLoggedIn,async (req,res)=>{

    //send mail
    const finddata=await usermodel.findOne({email:req.user.email});
    await sendmail(finddata.email,"Oops "+finddata.name+"! You have looged out ","Hey "+finddata.name+",\n\n\nYour have successfully  logged out from your account: "+finddata.username+". If you did not initiate this log out , please contact us immediately. \n\n\nBest regards,\nTeam Post Board");

    res.cookie('Token',"");
    
    res.redirect('/login');
})

//protected route
app.get('/profile',isLoggedIn,async (req,res)=>{
    const user=await usermodel.findOne({email:req.user.email}).populate('posts');//replaces reference ids with og documents
    console.log("Info in the profile:",user);
    res.render('profile',{theuser:user});
})

//create post

app.post('/post',isLoggedIn,async (req,res)=>{
    try{
        const {title,content}=req.body;
        //check if title and content is present
        if(!title || !content){
            return res.status(500).send("Please fill all the fields");
        }
        //create post
        const createpost=await postmodel.create({
            title:title,
            content:content,
            username:req.user.userid
        })
        console.log("Post created successfully",createpost);
        const user=await usermodel.findOne({email:req.user.email});
        user.posts.push(createpost._id);
        await user.save();
        return res.status(200).redirect('/profile#post'+createpost._id);
    }
    catch(err){
        console.log(err);
    }
})



//like feature
app.get('/like/:id',isLoggedIn,async (req,res)=>{
    try{
        const postid=req.params.id;
        const post=await postmodel.findOne({_id:postid}).populate('username');
        const userid=req.user.userid;//from is LOgged In
        //like
        if(post.likes.indexOf(userid)==-1){
            post.likes.push(userid);
        }
        //unlike
        else
        {
            post.likes.splice(post.likes.indexOf(userid),1);
        }
        await post.save();
        console.log("Post liked successfully",post);
        //redirect to previous page
        const previouspage=req.get('referer');
        res.redirect(previouspage+'#post'+postid);

    }
    catch(err){
        console.log(err);
    }
})


//edit route
app.get('/edit/:id',isLoggedIn,async (req,res)=>{
    try{
        const postid=req.params.id;
        const post=await postmodel.findOne({_id:postid}).populate('username');
        res.render('edit',{post});
    }
    catch(err){
        console.log(err);
    }
})
//updated the edits 
app.post('/update/:id',isLoggedIn,async (req,res)=>{
    try{
        const postid=req.params.id;
        const {title,content}=req.body;
        //check if title and content is present
        if(!title || !content){
            return res.status(500).send("Please fill all the fields");
        }
        //updated in the mongodb
        const updatepost=await postmodel.findOneAndUpdate({_id:postid},{
            title:title,
            content:content
        },{new:true});

        console.log("Post updated successfully",updatepost);

        res.redirect('/profile');
    }
    catch(err)
    {
        console.log(err);
    }
})

//delete post
app.get('/delete/:id',isLoggedIn,async (req,res)=>{
    try
    {
        const postId=req.params.id;
        const post=await postmodel.deleteOne({_id:postId});
        console.log("Post deleted successfully",post);

        res.redirect('/profile');

    }
    catch(err)
    {
        console.log(err)
    }

})

//delete account
app.get('/deleteaccount/:id',isLoggedIn,async (req,res)=>{
    try{
        const userid=req.params.id;
        const user=await usermodel.findOne({_id:userid}).populate('posts');
        if(user)
        {
            //delete all posts
            user.posts.forEach(async (post)=>{
                await postmodel.deleteOne({_id:post._id});
            })
            console.log("Posts deleted successfully");
            //delete user
            await usermodel.deleteOne({_id:userid});
            console.log("User deleted successfully");


            //logout
            res.redirect('/logout');
        }
    }
    catch(err)
    {
        console.log(err);
    }
})

//display profile
app.get('/displayprofile/:id',isLoggedIn,async (req,res)=>{
    try{    
        const user=await usermodel.findOne({email:req.user.email}).populate('posts');
        console.log("Info in the display profile:",user);
        const checkaccount=await usermodel.findOne({_id:req.params.id}).populate('posts');
        res.render('displayprofile',{account:checkaccount,theuser:user});
        
    }
    catch(err)
    {
        console.log(err);
    }
})

//serach accounts
app.post('/search',isLoggedIn,async (req,res)=>{
    try{
        const searchaccount=req.body.searchaccount;
        //check if search account is present
        const checkaccount=await usermodel.findOne({
            $or:[
                {username:searchaccount},
                {name:searchaccount}
            ]
        }).populate('posts');
        if(!checkaccount)
        {
            return res.status(500).send("Account not found");
        }
        console.log("Account found successfully",checkaccount);
       res.redirect('/displayprofile/'+checkaccount._id);
    }
    catch(err)
    {
        console.log(err);
    }
})

//error routes
app.all('*',(req,res)=>{
    res.status(404).send("Page not found");
})

//port
app.listen(process.env.PORT,()=>{
    console.log("Server started on port "+process.env.PORT);
})