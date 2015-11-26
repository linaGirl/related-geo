!function() {

    var   Class             = require('ee-class')
        , log               = require('ee-log')
        , type              = require('ee-types')
        , RelatedSelector   = require('related-selector');


    /*
     * distance selector
     */


    module.exports = function(extension) {

        // the class needds to know 
        var ClassConstructor = new Class({
            inherits: RelatedSelector


            // the name this selector is using on 
            // the selector class of the orm
           , name: 'distanceFrom'


            /**
             * store values passed by the user
             */
            , init: function init(options) {
                init.super.call(this, options);

                if (!options.parameters || options.parameters.length < 2) throw new Error('The distanceFrom extension requirees at least 2 paramets passed to it (lat, lng, maxDistance)!');
                
                // check if the distance must be computed on a subentity
                if (type.string(options.parameters[0]) && /[^0-9]/.test(options.parameters[0])) {
                    this.subEntity = options.parameters[0].split('.');
                    this.lat = options.parameters[1];
                    this.lng = options.parameters[2];
                }
                else {
                    this.lat = options.parameters[0];
                    this.lng = options.parameters[1];
                }

                if (options.parameters.length === 3) this.maxLength = options.parameters[2];
            }


            /**
             * render the selection
             */
            , render: function(select, renderContext) {
                return 'ROUND(7912 * (ASIN(SQRT(POWER(SIN(('+
                    renderContext.parameters.set('lat', this.lat, true)+
                    ' - abs('+renderContext.escapeId(this.entityName)+'.'+renderContext.escapeId(this.latColumn)+')) * 0.00872664626), 2) + COS('+
                    renderContext.parameters.set('lat', this.lat, true)+
                    ' * 0.0174532925) * COS(abs('+renderContext.escapeId(this.entityName)+'.'+renderContext.escapeId(this.latColumn)+') * 0.0174532925) * POWER(SIN(('+
                    renderContext.parameters.set('lng', this.lng, true)+
                    ' - '+renderContext.escapeId(this.entityName)+'.'+renderContext.escapeId(this.lngColumn)+') * 0.00872664626), 2)))) * 1609.344) '+renderContext.escapeId(this.alias);
            }


            /**
             * prepare the selector
             */
            , prepare: function(queryBuidler) {
                if (!this.subEntity) {
                    this.entityName = queryBuidler.entityName;

                    // set columns
                    this.latColumn = extension.getLatColumn(this.entityName);
                    this.lngColumn = extension.getLngColumn(this.entityName);
                }
            }
        });
    
        
        // make sure the extension is installable!
        RelatedSelector.prepare(ClassConstructor, 'distanceFrom');

        // return class
        return ClassConstructor;
    }
}();
