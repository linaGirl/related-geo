!function() {
    'use strict';


    var   Class                 = require('ee-class')
        , log                   = require('ee-log')
        , type                  = require('ee-types')
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




        /**
         * join a list of entites
         */
        , _joinTree: function(queryBuilder, path) {
            if (path.length) {
                return this._joinTree(queryBuilder.join(path[0], true), path.slice(1));
            }
            else {
                return {
                      aliasName: queryBuilder.getresource().getAliasName()
                    , entityName: queryBuilder.entityName
                }
            }
        }



        /*
         * we have to add our locale queries (sub selects)
         */
        , onBeforePrepareSubqueries: function(resource, definition) {
            var query = resource.getQuery();


            // find each instance of the distance selector, 
            // check if its inside the filter, create a subquery
            // if yes
            query.select.forEach(function(selection) {
                if (selection instanceof DistanceSelector) {

                    // check if the selector was applied to a subentity
                    if (selection.subEntity) {

                        // ued for moving stuff to other places
                        selection.replacementEntityName = resource.queryBuilder.entityName;

                        // join the path to the entity
                        var result = this._joinTree(resource.queryBuilder, selection.subEntity);

                        // needd to group by the primaries & the min of the seelection
                        query.group.push(selection.alias);

                        // group by primaries
                        resource.groupByPrimaryKeys();

                        // tell the selection which entity to use
                        selection.entityName = result.aliasName;
                        selection.latColumn = this.getLatColumn(result.entityName);
                        selection.lngColumn = this.getLngColumn(result.entityName);
                    }
                    else selection.replacementEntityName = selection.entityName;
                }
            }.bind(this));
        }



        /*
         * we have to add our locale queries (sub selects)
         */
        , onAfterPrepareSubqueries: function(resource, definition) {
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
                    var entityName = selection.replacementEntityName;

                    if (filter[entityName] && filter[entityName][selection.alias]) {
                        // move filter to parent query
                        if (!subQuery) subQuery = this.moveQuery(resource, query);

                        // move filter
                        if (!subQuery.filter.distanceQuery) subQuery.filter.distanceQuery = {};
                        subQuery.filter.distanceQuery[selection.alias] = filter[entityName][selection.alias];

                        delete filter[entityName][selection.alias];
                    }


                    // order
                    query.order.forEach(function(ordering, index) {
                        if (ordering.entity === entityName && ordering.property === selection.alias) {
                            idsToRemove.unshift(index);

                            if (!subQuery) subQuery = this.moveQuery(resource, query);

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
         * create a subquery
         */
        , moveQuery: function(resource, query) {
            var subQuery = resource.createQuery();
            
            subQuery.from = {
                  query: query
                , alias: 'distanceQuery'
            };

            if (query.limit) {
                subQuery.limit = query.limit;
                delete query.limit;
            }

            if (query.offset) {
                subQuery.offset = query.offset;
                delete query.offset;
            }

            subQuery.select.push('*');

            resource.setQuery(subQuery);

            return subQuery;
        }



        /**
         * called by the orm
         */
        , onBeforePrepare: function(resource, definition) {
            this.onBeforePrepareSubqueries(resource, definition);
        }


        /**
         * called by the orm
         */
        , onAfterPrepare: function(resource, definition) {
            this.onAfterPrepareSubqueries(resource, definition);
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
            }
            
            return true;
        }
    });
}();
