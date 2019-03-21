const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')
const shortId = require('shortid')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

var personSchema = new mongoose.Schema({
  userId:{type: String, default:shortId.generate},
  username: String,
  exercise:[{
    desc : String,
    duration : Number,
    date : {}
  }]
});

var Person = mongoose.model('Person',personSchema);

var createPerson = function(name, done){
  console.log("create person");
  Person.findOne({username:name},(err,findData)=>{
    console.log(findData);
    if(findData==null){
      var person = new Person({username:name,exercise:[]});
      person.save((err,data)=>err?done(err):done(null,data));
    } else if(err){
      done(err)
    } else {
      done(null,"taken")
    }
  })
};

var addExercise = function(personId, activity, done){
  console.log("add exercise");
  Person.findOne({userId:personId},(err,data)=>{
    if(data==null){
      done(null,"notFound")
    } else {
      if(data.exercise.length===0){
        console.log("length = 0")
        data.exercise = data.exercise.concat([activity])
      } else {
        var status = "pending";
        for (var i = 0; i <data.exercise.length; i++){
          if(Date.parse(activity.date) < Date.parse(data.exercise[i].date)){
            data.exercise.splice(i,0,activity);
            status = "done";
            console.log("tgl lebih muda")
            break;
          }
        }
        if(status=="pending"){
          data.exercise = data.exercise.concat(activity);
          console.log("tgl lebih tua")
        }
      }
      
      data.save((err,data)=>err?done(err):done(null,data));
    }
  })
}

function isValidDate(d){
  return d instanceof Date && !isNaN(d)
};

app.post('/api/exercise/new-user',(req,res)=>{
  createPerson(req.body.username,(err,data)=>{
    if(err){
      res.send({error:"Error, guy please try again"})
    } else if(data=="taken"){
      res.send({error:"Username already taken"})
    } else {
      res.send({"username":data.username, "userId":data.userId})
    }
  })
});

app.post('/api/exercise/add',(req,res)=>{
  let dateVar = "";
  if(req.body.date != ""){
    var dateVar2 = new Date(req.body.date);
    dateVar = dateVar2.toDateString();
  } else {
    dateVar = new Date().toDateString();
  }
  
  let activity = {
    desc : req.body.description,
    duration : req.body.duration,
    date : dateVar
  };
  if(activity.desc == "" || activity.duration == ""){
    res.send("Please fill all")
  } else {
  addExercise(req.body.userId,activity,(err,data)=>{
    if(err){
      res.send({error:"Error, please try again"});
    } else if(data=="notFound"){
      res.send({error:"User not found"})
    } else {
      var result = {
        "username" : data.username,
        "description" : activity.desc,
        "duration" : activity.duration,
        "id" : data.userId,
        "date" : activity.date
      }
      res.send(result)
    }
  })
  }
});

app.route('/api/exercise/log').get((req,res)=>{
  
  var personUser = req.query.username;
  Person.findOne({username : personUser},(err,data)=>{
    console.log("this is route 02");
    if(data==null){
      res.send({"error":"User Name not found"})
    } else {
    var logCount = data.exercise.length;
      
    var fromDate = Date.parse(req.query.from);
    var toDate = Date.parse(req.query.to);
    var limit = Number (req.query.limit);
    var logLimit = data.exercise;
    
    fromDate ? null : fromDate = Date.parse(0);
    toDate ? null : toDate = Date.now();
        
    logLimit = logLimit.filter((item)=>new Date(item.date)>=fromDate).filter((item)=>new Date(item.date)<=toDate);
    console.log(limit);
    limit ? limit >= logLimit.length ? null : logLimit = logLimit.slice(0,limit): console.log("It isn't a number");
      
    var result = {
      "User Id" : data.userId,
      "User Name": data.username,
      "Log Count": logCount + " log display:" + logLimit.length ,
      "Log" : logLimit
    }
    res.send(result)
    }
  })
}).post()


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
