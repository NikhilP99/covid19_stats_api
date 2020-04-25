const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express()

app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


app.get('/',(req,res)=>{
    res.send("hello, i am alive")
})

const PORT = process.env.PORT || 5000
app.listen(PORT, ()=>{
  console.log("Server is listening to port: ", PORT)
})
