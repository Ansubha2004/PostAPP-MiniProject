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
            const token=jwt.sign({email,userid:createuser._id},"ansubha ka secret key");
            res.cookie('Token',token);
            console.log("Token created successfully",token);

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
                const token=jwt.sign({email,userid:finddata._id},"ansubha ka secret key");
                res.cookie('Token',token);
                console.log("Token created successfully",token);

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
app.get('/logout',(req,res)=>{
    res.cookie('Token',"");
    res.redirect('/login');
})

//protected route
app.get('/profile',isLoggedIn,async (req,res)=>{
    const user=await usermodel.findOne({email:req.user.email}).populate('posts');//replaces reference ids with og documents
    console.log("Info in the profile:",user);
    res.render('profile',{theuser:user});
})

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
        return res.status(200).redirect('/profile');
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
        res.redirect("/profile#post");
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

//error routes
app.all('*',(req,res)=>{
    res.status(404).send("Page not found");
})

//port
app.listen(2929,()=>{
    console.log("Server started on port 2929");
})