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
    res.render('index');
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
    res.redirect('/');
})

//protected route
app.get('/profile',isLoggedIn,(req,res)=>{
    console.log(req.user);
    res.render('profile');
})

//error routes
app.all('*',(req,res)=>{
    res.status(404).send("Page not found");
})

//port
app.listen(2929,()=>{
    console.log("Server started on port 2929");
})