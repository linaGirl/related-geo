!function() {
    'use strict';


    var   Class                 = require('ee-class')
        , log                   = require('ee-log')
        , type                  = require('ee-types')
        , Promise               = (Promise || require('es6-promise').Promise)
        , ORMExtension          = require('related-extension')
        , distanceSelector      = require('./DistanceSelector');


    var   thisContext
        , DistanceSelector
        , ORM;


    /**
     * search object in the distance of a
     * a set of coordiantes or inside a box
     *
     * distance = distanceFrom(lat, lng, maxDistance)
     * box = insideBox(latTop, lngLeft, latBottom, lngRight)
     *
     *
     */


    module.exports = new Class({
        inherits: ORMExtension

        // default values for the fieldnames
        // of the coordiantes
        , lat: ['lat', 'latitude']
        , lng: ['lng', 'lon', 'long', 'longitude']

     

        // offset to swith from query strategy A to B in meters
        , offsetRadius: 20000


        // the plugins name
        , _name: 'related-geo'



        , init: function init(options) {
            init.super.call(this);

            // store this context so we'll have acces in some
            // methods attached to the model
            thisContext = this;

            // prepare the selector
            if (!DistanceSelector) DistanceSelector = distanceSelector(this);

            // make the selector available on the orm
            this.selectors.push(DistanceSelector);


            // the user may define the name of the fields
            if (options) {
                if (type.array(options.latColumns)) this.lat = options.latColumns.concat(this.lat);
                if (type.array(options.lngColumns)) this.lat = options.lngColumns.concat(this.lat);

                if (type.number(options.offsetRadius)) this.offsetRadius = options.offsetRadius;
            }

            // store the columns
            this.storage = {};
        }





        /**
         * retuns the name of the lat column for a specif centity
         *
         * @param <String> entityName
         *
         * @returns <String> lat column name 
         */
        , getLatColumn: function(entityName) {
            if (!this.storage[entityName]) throw new Error('Cannot us the distanceFrom selector on the «'+entityName+'» entity, the extensions is not enabled on this entity!');
            return this.storage[entityName].lat;
        }


        /**
         * retuns the name of the lng column for a specif centity
         *
         * @param <String> entityName
         *
         * @returns <String> lat column name 
         */
        , getLngColumn: function(entityName) {
            if (!this.storage[entityName]) throw new Error('Cannot us the distanceFrom selector on the «'+entityName+'» entity, the extensions is not enabled on this entity!');
            return this.storage[entityName].lng;
        }






        /*
         * we have to add our locale queries (sub selects)
         */
        , onBeforePrepareSubqueries: function(resource, definition) {
            var   query = resource.getQuery()
                , filter = query.filter
                , order = query.order
                , idsToRemove = []
                , map = {}
                , subQuery;

            // find each instance of the distance selector, 
            // check if its inside the filter, create a subquery
            // if yes
            query.select.forEach(function(selection) {
                if (selection instanceof DistanceSelector) {
                    if (filter[selection.entityName] && filter[selection.entityName][selection.alias]) {
                        // move filter to parent query
                        if (!subQuery) {
                            subQuery = resource.createQuery();
                            subQuery.from = {
                                  query: query
                                , alias: 'distanceQuery'
                            };

                            subQuery.select.push('*');

                            resource.setQuery(subQuery);
                        }


                        // move filter
                        if (!subQuery.filter.distanceQuery) subQuery.filter.distanceQuery = {};
                        subQuery.filter.distanceQuery[selection.alias] = filter[selection.entityName][selection.alias];

                        delete filter[selection.entityName][selection.alias];
                    }


                    // order
                    query.order.forEach(function(ordering, index) {
                        if (ordering.entity === selection.entityName && ordering.property === selection.alias) {
                            idsToRemove.unshift(index);

                            if (!subQuery) {
                            subQuery = resource.createQuery();
                                subQuery.from = {
                                      query: query
                                    , alias: 'distanceQuery'
                                };

                                subQuery.select.push('*');

                                resource.setQuery(subQuery);
                            }

                            ordering.entity = 'distanceQuery';
                            subQuery.order.push(ordering);
                        }
                    }.bind(this));


                    idsToRemove.forEach(function(index) {
                        query.order.splice(index, 1);
                    }.bind(this));
                }
            }.bind(this));
        }



        /**
         * called by the orm
         */
        , onBeforePrepare: function(resource, definition) {
            this.onBeforePrepareSubqueries(resource, definition);
        }




        /*
         * checks if this extension should be applied to the
         * current model
         */
        , useOnModel: function(definition) {
            var   mappingDefinition
                , lat
                , lng;

            // check if the required fields are onthe tabel
            if (Object.keys(definition.columns).some(function(columnName) {
                if (!lat && this.lat.indexOf(columnName) >= 0) lat = columnName;
                if (!lng && this.lng.indexOf(columnName) >= 0) lng = columnName;
                return lat && lng;
            }.bind(this))) {
                this.storage[definition.getTableName()] = {
                      lat: lat
                    , lng: lng
                };

                // tell to use this extension on this table
                return true;
            }
            
            return false;
        }
    });
}();
