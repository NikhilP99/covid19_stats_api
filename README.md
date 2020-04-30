# stats_covid19_api
An api which provides json data for covid19 stats. Data source: JHU CSSE. 

## Get total (Global) data 
Total number of comfirmed cases, deaths and recoveries.

 - URL: `/jhu-data/total`
 - method: `GET`

## Get current data (country wise)

 - URL: `/jhu-data/current`
 - Method: `GET`
 - Query params: 
    - merge_countries:
      - Combine data of various states/provinces of a country 
      - value: `true` or `false` 
    - country_code: 
      - Get data of a particular country
      - value: [iso2 (or alpha 2) country code](https://www.nationsonline.org/oneworld/country_code_list.htm) of the required country 
- Sample URL: `/jhu-data/current?country_code=CN&merge_countries=true`

## Get time series (country wise)
Date wise data of number of confirmed cases, deaths and recovered cases of each country

 - URL: `/jhu-data/time_series`
 - Method: `GET`
 - Query params: 
    - merge_countries:
      - Combine data of various states/provinces of a country 
      - value: `true` or `false` 
    - country_code: 
      - Get data of a particular country
      - value: [iso2 (or alpha 2) country code](https://www.nationsonline.org/oneworld/country_code_list.htm) of the required country 
- Sample URL: `/jhu-data/time_series?country_code=US&merge_countries=true`


## To run locally
type these into your terminal
```sh
$ git clone https://github.com/NikhilP99/covid19_stats_api.git
$ cd covid19_stats_api
$ npm install
$ npm start
```
