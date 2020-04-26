const express = require('express')
const router = express.Router()
const csvtojson = require('csvtojson')
const request = require('request')
const lookup = require('country-code-lookup')

var data = {
  brief : {},
}

const global_stats_source = {
  confirmed: 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv',
  deaths: 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv',
  recovered: 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv'
}

const correctedCountryNames = {
  "Mainland China": "China",
  "Macau": "Macau (China)",
  "Hong Kong": "Hong Kong (China)",
  "US": "United States",
  "UK": "United Kingdom",
  "North Macedonia": "Macedonia",
  "Korea, South": "South Korea",
  "Congo (Brazzaville)": "Democratic Republic of the Congo",
  "Congo (Kinshasa)": "Republic of the Congo"
}

let lastUpdated;

router.get('/brief',(req,res) => {

})

router.post('/get',async (req,res)=>{
  var ans = await updateData()

  res.send(ans)
})

async function updateData(){
  lastUpdated = new Date().toISOString()
  console.log('Updated at:' + lastUpdated)

  const rawData = {
    confirmed: {},
    deaths: {},
    recovered: {}
  }

  await getCSV_to_JSON(rawData.confirmed, 'confirmed')
  await getCSV_to_JSON(rawData.deaths, 'deaths')
  await getCSV_to_JSON(rawData.recovered, 'recovered')

  const total = {
    confirmed: 0,
    deaths: 0,
    recovered: 0
  }

  const current = {}

  const time_series = {}

  //Object.entries creates nested array from object
  for(const [type, obj] of Object.entries(rawData)){
    // ['confirmed',{...}]
    for(const [name, data] of Object.entries(obj)){
      //['India', {...}]

      var keys = Object.keys(data); //array of keys of object
      var lastKey = keys[keys.length - 1] //most recent date
      var val = data[lastKey] //it is a string

      const latest = Number(val)
      total[type] += latest

      defineStructure(current, name, data)
      current[name][type] = latest



    }
  }

  return current;

}

function getCSV_to_JSON(store,key){
  //see https://www.npmjs.com/package/csvtojson
  return csvtojson()
          .fromStream(request.get(global_stats_source[key]))
          .subscribe((json) => {
            return new Promise((resolve,reject) => {
              if(json['Province/State']){
                const province = json['Province/State']
                store[province] = json
              }else if(json['Country/Region']){
                const country = json['Country/Region']
                store[country] = json
              }

              resolve()
            })
          })
}


function defineStructure(store,name,data){
  if(!store.hasOwnProperty(name)){
    store[name] = {}
    store[name]['Province/State'] = data['Province/State']
    store[name]['Country/Region'] = data['Country/Region']
    store[name].lastUpdated = lastUpdated
    store[name] = {
      location: {
        lat: Number(data.Lat),
        lng: Number(data.Long)
      }
    }

    //add country code
    let country = data['Country/Region']
    if(lookup.byCountry(country)){
      store[name].countryCode = lookup.byCountry(country).iso2
    }
    else if(correctedCountryNames[country]){
      store[name].countryCode = lookup.byCountry(correctedCountryNames[country]).iso2
    }

  }
}

module.exports = router
