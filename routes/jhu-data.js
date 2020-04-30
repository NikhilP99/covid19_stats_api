const express = require('express')
const router = express.Router()
const csvtojson = require('csvtojson')
const request = require('request')
const lookup = require('country-code-lookup')
const nestedProperty = require('nested-property')
const cron = require('node-cron');


var data = {
  total : {},
  current: {},
  time_series: {},
  merged_current: {},
  merged_time_series: {}
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

//evert hour
cron.schedule('00 59 * * * *', () => {
  console.log('Updating data'); //each hour
  updateData()
});

let lastUpdated;

router.get('/total',async (req,res) => {
  res.json(data.total)
})

router.get('/current',async (req,res)=>{
  const country_code = req.query.country_code
  const merge_countries = req.query.merge_countries

  if(merge_countries){
    var current_data = data.merged_current
  }else{
    var current_data = data.current
  }

  if(country_code){
    current_data = filteriso2(current_data,country_code)
    res.send(current_data[0])
  }
  else
    res.send(current_data)
})

router.get('/time_series',async (req,res)=>{
  const country_code = req.query.country_code
  const merge_countries = req.query.merge_countries

  if(merge_countries){
    var ts = data.merged_time_series
  }else{
    var ts = data.time_series
  }

  if(country_code){
    ts = filteriso2(ts,country_code)
    res.send(ts[0])
  }
  else
    res.send(ts)
})

function filteriso2 (source, code) {
  return source.filter(item => {
    const countryCode = item.countryCode
    return countryCode === code
  })
}

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
  //Rough structure
  // current = {
  //   name : {
  //     country_region:
  //     province_state:
  //     countryCode:
  //     location: {
  //       lat:
  //       long:
  //     }
  //     confirmed:
  //     deaths:
  //     recovered:
  //   }
  // }

  const time_series = {}
  // rough structure
  // time_series = {
  //   name: {
  //     country_region:
  //     province_state:
  //     countryCode:
  //     location: {
  //       lat:
  //       long:
  //     }
  //     time_series: {
  //       date: {
  //         confirmed:
  //         deaths:
  //         recovered:
  //       }
  //     }
  //   }
  // }

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

      defineStructure(time_series, name, data)
      var dates = keys.slice(4) //removng every key except dates

      for (const date of dates){
        var formatted_date = date.replace('/20','/2020')
        formatted_date = formatted_date.replace('/2020/20','/20/2020')
        nestedProperty.set(time_series[name], `time_series.${formatted_date}.${type}`, Number(data[date]))
      }
    }
  }

  data.total = total
  data.current = Object.values(current)
  data.time_series = Object.values(time_series)

  // Uses deep copy
  const clone_current = JSON.parse(JSON.stringify(current))
  data.merged_current = merge_same_countries(Object.values(clone_current))
  const clone_time_series = JSON.parse(JSON.stringify(time_series))
  data.merged_time_series = merge_same_countries(Object.values(clone_time_series))

  console.log("Update complete")

}

function merge_same_countries(original){
  merged_data = {}

  for(const data of original){
    var country_name = data.country_region

    if(merged_data[country_name]){
      var country_data = merged_data[country_name]

      //for current
      mergeObject(country_data,data);

      // for time series
      if (data.time_series) {
        const ts = data.time_series
        const merged_time_series = country_data.time_series

        for (const key of Object.keys(ts)) {
          mergeObject(merged_time_series[key], ts[key])
        }

        // TODO: replace country locations
      }

    }else{
      merged_data[country_name] = data
    }
  }

  return Object.values(merged_data)
}

function mergeObject (target, item) {
  if (!(target && item)) return

  if (item.confirmed) mergeItem(target, item, 'confirmed')
  if (item.deaths) mergeItem(target, item, 'deaths')
  if (item.recovered) mergeItem(target, item, 'recovered')
}

function mergeItem (target, item, type) {
  const cur = target[type] ? target[type] : 0
  const add = item[type] ? item[type] : 0

  target[type] = cur + add
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
    store[name] = {
      province_state : data['Province/State'],
      country_region : data['Country/Region'],
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

updateData()

module.exports = router
