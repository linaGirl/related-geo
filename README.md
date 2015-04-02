# related-geo

Lets you filter and order records by their GPS position.


[![npm](https://img.shields.io/npm/dm/related-selector.svg?style=flat-square)](https://www.npmjs.com/package/related-selector)
[![Travis](https://img.shields.io/travis/eventEmitter/related-selector.svg?style=flat-square)](https://travis-ci.org/eventEmitter/related-selector)
[![node](https://img.shields.io/node/v/classDefinitionrelatedgeo.svg?style=flat-square)](https://nodejs.org/)

Features:
    - compute the distance for every row to a given set of coordinates
    - return items that are inside a box on a map
    - order rows by distance to a point
    - filter events based on the distance to a point
    - any combination of the items above

The extension works with two different strategies to get the fastest results when executing searches on the distance. Its generally not recommended to work on very large data sets. If you are looking for items in a reasonable small radius the extension uses strategy A to limit the dataset to that radius which makes it possible to return an ordered dataset in a reasonable amount of time. If you don't limit the set by a reasonable small radius the extension uses strategy B which is somewhat slower but performs better when there is no limit to the radius. You may configure what that radius is with the `radius` option. The configuration can be set per table. The default offset to switch from strategy A to strategy B is 20 km. If you have many items inside such a radius you should set it to a smaller number. In any case a sequantial scan is used to compute the distance.

## installation

    npm i related-geo

### Postgres

    You should create an index on your latitude and longitude columns using the gist extension

        CREATE INDEX name_of_index on table USING gist(ll_to_earth(latColumn, lngColumn));

### MySQL

    You should create an index on your latitude and longitude columns


## API

Get an related ORM instance

    var   RelatedORM = require('related')
        , RelatedGEO = require('related-geo')

    var related = new RelatedORM(config);

Add the extension

    related.use(new RelatedGEO());


The extension tries to apply the filters and selects to columns with the following names:

- latitude: lat, latitude
- longitude: lng, lon, long, longitude

If your tables contain gps fields with different names you may add them as option when you
instantiate the extension

    related.use(new RelatedGEO({
          latColumns: ['myLat', 'customLat']
        , lngColumns: ['myLng']
    }));


If you want to define a custom offset to switch from strategy A to startegy B for doing radius searches you can define it in the options. You may define a global value and addiotionally a custom value per table.


    related.use(new RelatedGEO({
          offsetRadius: 10000
        , myDb: {
            myTableName: {
                offsetRadius: 2000
            }
        }
    }));



### Distance

Find venues inside a radius around a given position, order by distance

    orm.db.venue([RelatedORM.select('distance').distanceFrom(lat, lng)], {
        distance: RelatedORM.filter.lt(2000)
    })
    .order('distance')
    .limit(100)
    .find()
    .then()
    .catch();


### Box


Find venues inside of a box

    orm.db.venue({
        RelatedORM.filter.insideBox(latTop, lngLeft, latBottom, lngRight)
    })
    .limit(100)
    .then()
    .catch();


### Combined

Find venues inside of a box, order them by distance to the center of the box

    orm.db.venue([RelatedORM.select('distance').distanceFrom(RelatedORM.function.getCenter(latTop, lngLeft, latBottom, lngRight))], {
        RelatedORM.filter.insideBox(latTop, lngLeft, latBottom, lngRight)
    })
    .order('distance')
    .limit(100)
    .find()
    .then()
    .catch();
