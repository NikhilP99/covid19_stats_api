const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express()

app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const jhuData = require('./routes/jhu-data')

app.use('/jhu-data', jhuData)

app.get('/',(req,res)=>{
    res.send("API service for COVID-19 data")
})

const PORT = process.env.PORT || 5000
app.listen(PORT, ()=>{
  console.log("Server is listening to port: ", PORT)
})
