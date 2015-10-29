
	process.env.debug_sql = true;


	var   log 			= require('ee-log')
		, assert 		= require('assert')
		, fs 			= require('fs')
		, Related 		= require('related');



	var   RelatedGEO = require('../')
		, sqlStatments
		, extension
		, related
		, db;


	// sql for test db
	sqlStatments = fs.readFileSync(__dirname+'/db.postgres.sql').toString().split(';').map(function(input){
		return input.trim().replace(/\n/gi, ' ').replace(/\s{2,}/g, ' ')
	}).filter(function(item){
		return item.length;
	});



	describe('Travis', function(){
		it('should have set up the test db', function(done){
			var config;

			try {
				config = require('../config.js').db
			} catch(e) {
				config = [{
					  type: 'postgres'
					, schema: 'related_geo_test'
					, database: 'test'
					, hosts: [{
						  host 		: 'localhost'
						, username 	: 'postgres'
						, password 	: ''
						, port 		: 5432
						, mode 		: 'readwrite'
						, database 	: 'test'
					}]
				}];
			}

			this.timeout(5000);
			related = new Related(config);
			related.load(done);
		});

		it('should be able to drop & create the testing schema ('+sqlStatments.length+' raw SQL queries)', function(done) {
			related.getDatabase('related_geo_test').getConnection(function(err, connection) {
				if (err) done(err);
				else {
					Promise.all(sqlStatments.map(function(sql) {
						return new Promise(function(resolve, reject) {
							connection.queryRaw(sql, function(err) {
								if (err) reject(err);
								else resolve();
							});
						});
					})).then(function() {
						done();
					}).catch(done)
				}//async.each(sqlStatments, connection.queryRaw.bind(connection), done);
			});
		});
	});


	var getJSON = function(input) {
		if (Array.isArray(input)) return input.map(getJSON);
		else if (typeof input === 'object') {
			var output = input.toJSON ? input.toJSON() : input;
			if (input.children) output.children = getJSON(input.children);
			return output;
		}
		else return input;
	}


	var expect = function(val, cb){
		if (typeof val === 'string') val = JSON.parse(val);

		return function(err, result) { //log(getJSON(result), val, JSON.stringify(result), JSON.stringify(val));
			try {
				assert.deepEqual(getJSON(result), val);
			} catch (err) {
				return cb(err);
			}
			cb();
		}
	};


	describe('The GEO Extension', function() {
		var oldDate;

		it('should not crash when instatiated', function() {
			db = related.related_geo_test;
			extension = new RelatedGEO();
		});


		it('should not crash when injected into the related', function(done) {
			related.use(extension);
			related.reload(done);
		});

		it('set var should work ;)', function() {
			db = related.related_geo_test;
		});
	});



	describe('Inserting Test Data', function() {
		it('Random Data', function(done) {

			this.timeout(10000);

			Promise.all(Array.apply(null, {length:100}).map(function(item, index) {
				return new db.venue({
					  lat 	: Math.random()*90*(Math.round(Math.random()) === 1 ? -1 : 1)
					, lng 	: Math.random()*180*(Math.round(Math.random()) === 1 ? -1 : 1)
					, name 	: 'venue_'+index
				}).save();
			})).then(function() {
				return Promise.all(Array.apply(null, {length:100}).map(function(item, index) {
					return new db.event({
						  name 		: 'event_'+index
						, id_venue  : Math.ceil(Math.random()*100)
					}).save();
				}));
			}).then(function() {
				done();
			}).catch(done);
		});
	});


	describe('Querying', function() {
		it('Using the distanceFrom selector', function(done) {
			db.venue(['*', Related.select('distance').distanceFrom(46, 7)], {
				distance: Related.lt(5000000)
			}).order('distance').limit(10).find(done);
		});

		it('Using the distanceFrom selector on another entity', function(done) {
			db.event(['*', Related.select('distance').distanceFrom('venue', 46, 7)], {
				distance: Related.lt(5000000)
			}).order('distance').limit(10).find(done);
		});
	});


