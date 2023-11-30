const express = require('express');
const app=express();
const cors = require('cors');
const jwt=require('jsonwebtoken')
require('dotenv').config()
const port=process.env.PORT||5000;

//middlewares
app.use(cors());
app.use(express.json())




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.clkkquk.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();

    const usersCollection= client.db('forumDB').collection('users');
    const postsCollection=client.db('forumDB').collection('posts');
    const tagsCollection=client.db('forumDB').collection('tags');
    const commentsCollection=client.db('forumDB').collection('comments');
    const announcementsCollection=client.db('forumDB').collection('announcements');

    app.post('/jwt',async(req,res)=>{
      const user=req.body;
      const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:'1h'
      });
      res.send({ token });
    })

    const verifyToken=(req,res,next)=>{
      console.log('inside',req.headers)
      if(!req.headers.authorization){
        return res.status(401).send({message:'unauthorized'})
      }
      const token=req.headers.authorization.split(' ')[1];
      jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
        if(err){
          return res.status(401).send({message:'unauthorized'})
        }
        req.decoded=decoded;
        next();
      })
    }

    const verifyAdmin=async(req,res,next)=>{
      const email=req.decoded.email;
      const query={email: email};
      const user=await usersCollection.findOne(query);
      const isAdmin=user?.role==='admin'
      if(!isAdmin)
      {
        return res.status(403).send({message:'forbidden'})
      }
      next();

    }




    app.get('/users/admin/:email',verifyToken,async(req,res)=>{
        const email=req.params.email;
        if(email !== req.decoded.email)
        {
          return res.status(403).send({message:'forbidden email'});
        }
        const query ={email: email};
        const user= await usersCollection.findOne(query);
        let admin = false;
        if(user)
        {
          admin=user?.role==='admin';
        }
        res.send({admin});
    })


    app.get('/comments',async(req,res)=>{
      const cursor=commentsCollection.find();
      const result=await cursor.toArray();
      res.send(result);
    })

    app.post('/comments',async(req,res)=>{
      const comment=req.body;
      const result=await commentsCollection.insertOne(comment);
      res.send(result);
    })

    app.get('/tags',async(req,res)=>{
      const cursor=tagsCollection.find();
      const result=await cursor.toArray();
      res.send(result);
    })

    app.post('/tags',async(req,res)=>{
      const tag=req.body;
      const result=await tagsCollection.insertOne(tag);
      res.send(result);
  })


    app.get('/makeAnnouncements',async(req,res)=>{
      let query={};
        if(req.query?.email){
            query={email: req.query.email};
        }
        const cursor=announcementsCollection.find(query);
        const result=await cursor.toArray();
        res.send(result);
    })

    app.post('/makeAnnouncements',async(req,res)=>{
      const announcement=req.body;
      const result=await announcementsCollection.insertOne(announcement);
      res.send(result);
    })


    app.delete('/posts/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)}
      const result=postsCollection.deleteOne(query)
      res.send(result);
    })

    app.get('/posts',async(req,res)=>{
        let query={};
        if(req.query?.email){
            query={email: req.query.email}
        }
        const cursor=postsCollection.find(query);
        const result=await cursor.toArray();
        res.send(result);

    })

    app.post('/posts',async(req,res)=>{
        const post=req.body;
        const result=await postsCollection.insertOne(post);
        res.send(result);
    })

    app.patch('/users/admin/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)}
      const updatedDoc={
        $set:{
          role:'admin'
        }
      }
      const result=await usersCollection.updateOne(query,updatedDoc)
    })

    app.delete('/users/:id',verifyToken,verifyAdmin, async(req,res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)}
      const result=usersCollection.deleteOne(query)
      res.send(result);
    })

    app.get('/users',async(req,res)=>{
     
        let query={};
        if(req.query?.email){
            query={email: req.query.email}
        }
        const cursor=usersCollection.find(query);
        const result=await cursor.toArray();
        res.send(result);
    });

    app.post('/users',verifyToken,verifyAdmin, async (req, res) => {
        const user = req.body;
        const query={email: user.email}
        const existingUser=await usersCollection.findOne(query);
        if(existingUser)
        {
            res.send({message:'user already exists', insertedId:null})
        }
        const result = await usersCollection.insertOne(user);
       console.log(result);
        res.send(result);
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);




app.get('/',(req,res)=>{
    res.send("Forum server is ready")
})

app.listen(port,()=>{
    console.log(`Forum is running on${port}`)
})