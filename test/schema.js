var should = require('should')
  , sinon = require('sinon')
  , Errors = require('common-errors')
  , Schema = require('../lib/schema')

describe('Schema', function() {
	
	describe('.new()', function() {
		it('should handle shorthand type notation', function() {
			var schema = new Schema({ test:String })
			schema.definition.test.type.should.equal(String)
		})
		it('should handle shorthand object notation', function() {
			var schema = new Schema({ test:{ a:String } })
			schema.definition.test.schema.should.be.an.instanceof(Schema)
		})
		it('should handle shorthand arrays', function() {
			var schema = new Schema({ test: [String] })
			schema.definition.test.type.should.equal(Array)
			schema.definition.test.items.type.should.equal(String)
		})
		it('should throw on an invalid type', function() {
			(function() {
				var schema = new Schema({ test:'hi' })
			}).should.throw(/type/i)
		})
		it('should give nested errors', function() {
			(function() {
				var schema = new Schema({ test:{ whoa:'hi' } })
			}).should.throw(/test\.whoa/i)
		})
		it('should throw on an invalid default', function() {
			try {
				var schema = new Schema({ test:{ type:String, default:1 } })
			} catch(e) {
				e.should.be.an.instanceof(Errors.ValidationError)
				e.errors.length.should.equal(1)
				e.errors[0].message.toString().should.match(/default/)
			}
		})
		it('should require a schema for objects', function() {
			(function() {
				new Schema({ test:Object })
			}).should.throw()
		})
		it('should handle crazy nested schemas', function() {
			var schema = new Schema({ 
				name:String,
				people: [{
					locations: [{
						name:String,
						address: {
							street:String,
							zip:String
						}
					}]
				}] 
			})
	   
			schema.definition.people.type.should.equal(Array)
			schema.definition.people.items.type.should.equal(Object)
			schema.definition.people.items.schema.definition.locations.type.should.equal(Array)
			schema.definition.people.items.schema.definition.locations.items.type.should.equal(Object)
			schema.definition.people.items.schema.definition.locations.items.schema.definition.address.type.should.equal(Object)
			schema.definition.people.items.schema.definition.locations.items.schema.definition.address.schema.definition.zip.type.should.equal(String)
		})
		it('should handle field-level plugins')
	})

	describe('.use()', function() {
		it('should call the plugin with Schema and options', function() {
			var plugin = sinon.spy()
			  , options = {}

			Schema.use(plugin, options)
			plugin.getCall(0).calledWithExactly(Schema, options)
		})
		it('should call the plugin with Schema and a empty object (if no options are passed)', function() {
			var plugin = sinon.spy()

			Schema.use(plugin)
			plugin.getCall(0).calledWith(Schema)
			plugin.getCall(0).args[1].should.be.an.instanceof(Object)
		})
	})

})

describe('schema', function() {

	describe('.use()', function() {
		it('should call the plugin with the schema and options', function() {
			var schema = new Schema({ name:String })
			  , plugin = sinon.spy()
			  , options = {}

			schema.use(plugin, options)
			plugin.getCall(0).calledWithExactly(schema, options)
		})
		it('should call the plugin with the schema and a empty object (if no options are passed)', function() {
			var schema = new Schema({ name:String })
			  , plugin = sinon.spy()

			schema.use(plugin)
			plugin.getCall(0).calledWith(schema)
			plugin.getCall(0).args[1].should.be.an.instanceof(Object)
		})
	})

	describe('.validateField()', function() {
		var validator_pass = sinon.stub()
		  , validator_fail = sinon.stub().throws(new Error('failure'))
		  , validator_transform = sinon.stub().returns(42)
		  , schema = new Schema({ 
		    	name:String, 
		    	age: { type:Number, default:18 }, 
		    	birthday:Date, 
		    	address:{ 
		    		street:String, 
		    		zip:String 
		    	},
		    	phones: [String],
		    	pass: { type:String, validators:[validator_pass] },
		    	fail: { type:String, validators:[validator_fail] },
		    	transform: { type:Number, validators:[validator_transform] }
		    })

		it('should validate type', function() {
			schema.validateField({ name:'Michael' }, 'name').should.be.true
			try {
				schema.validateField({ name:1 }, 'name')
				throw new Error('should have thrown')
			} catch(e) {
				e.should.be.an.instanceof(Errors.ValidationError)
				e.errors.length.should.eql(1)
				e.errors[0].message.toString().should.match(/Expected Name to be a String/)
			}
		})
		it('should coerce type', function() {
			var data = { birthday:'1990-06-09', age:'10' }
			schema.validateField(data, 'birthday').should.be.true
			data.birthday.should.be.an.instanceof(Date)
			schema.validateField(data, 'age').should.be.true
			data.age.should.be.an.instanceof(Number)
		})
		it('should not allow keys not defined in the schema', function() {
			try {
				schema.validateField({ i_dont_exist:1 }, 'i_dont_exist')
				throw new Error('should have thrown')
			} catch(e) {
				e.should.be.an.instanceof(Errors.ValidationError)
				e.errors.length.should.eql(1)
				e.errors[0].message.toString().should.match(/i_dont_exist is not in the schema/)
			}
		})
		it('should call validators', function() {
			var obj = { pass:'abc', fail:'123', transform:1 }
			
			schema.validateField(obj, 'pass').should.be.true
			validator_pass.calledWith(obj.pass, obj, 'pass', 'Pass').should.be.true
			
			try {
				schema.validateField(obj, 'fail')
				throw new Error('should have thrown')
			} catch(e) {
				e.should.be.an.instanceof(Errors.ValidationError)
				validator_fail.threw().should.be.true
			}
			
			schema.validateField(obj, 'transform').should.be.true
			validator_transform.calledWith(1, obj, 'transform', 'Transform').should.be.true
			obj.transform.should.equal(42)
		})
		it('should validate nested keys', function() {
			schema.validateField({ address: { street:'123 Easy St.' } }, 'address.street').should.be.true
			schema.validateField({ address: { street:'123 Easy St.' } }, 'address').should.be.true
			try {
				schema.validateField({ address: { street:[] } }, 'address.street')
				throw new Error('should have thrown')
			} catch(e) {
				e.should.be.an.instanceof(Errors.ValidationError)
				e.errors.length.should.eql(1)
				e.errors[0].message.toString().should.match(/Expected Street to be a String/)
			}
		})
		it('should validate arrays', function() {
			schema.validateField({ phones:[] }, 'phones').should.be.true
			schema.validateField({ phones:['555-555-5555'] }, 'phones').should.be.true

			try {
				schema.validateField({ phones:[123] }, 'phones')
				throw new Error('should have thrown')
			} catch(e) {
				e.should.be.an.instanceof(Errors.ValidationError)
				e.errors.length.should.eql(1)
				e.errors[0].message.toString().should.match(/Expected Phones\[\] to be a String/)
			}
			
			try {
				schema.validateField({ phones:'555-555-5555' }, 'phones')
				throw new Error('should have thrown')
			} catch(e) {
				e.should.be.an.instanceof(Errors.ValidationError)
				e.errors.length.should.eql(1)
				e.errors[0].message.toString().should.match(/Expected Phones to be a Array/)
			}
		})

		it('should apply defaults', function() {
			var data = { age:null }
			schema.validateField(data, 'age').should.be.true
			data.age.should.equal(18)
		})
	}) 

	describe('.validate()', function() {
		var schema = new Schema({ 
			name: { type:String, required:true },  
			nickname: { type:String, required:function(obj, key, name) {
				if(obj.name.length > 9) 
					throw new Error(name + ' is required when Name is longer than 9 chars.')
			}},
			age: { type:Number, default:18 }, 
			birthday:Date,
			address:{ 
				street:String, 
				zip:{ type:String, default:'24019' } 
			} 
		})
		
		it('should validate types', function() {
			schema.validate({ name:'Michael', age:24, birthday:new Date('1990-06-09')}).should.be.true
			try {
				schema.validate({ name:'Michael', age:'abc', birthday:new Date('1990-06-09'), address:{ street:2 }})
				throw new Error('should have thrown')
			} catch(e) {
				e.should.be.an.instanceof(Errors.ValidationError)
				e.errors.length.should.eql(2)
			}
		})

		it('should return all errors', function() {
			try {
				schema.validate({ name:123, nickname:'one', age:'abc' })
				throw new Error('should have thrown')
			} catch(e) {
				e.errors.length.should.eql(2)
			}
		})

		it('should apply defaults to non-existant keys', function() {
			var data = { name:'Michael' }
			schema.validate(data).should.be.true
			data.age.should.equal(18)
			data.address.zip.should.equal('24019')
		})
		it('should require required fields', function() {
			try {
				schema.validate({})
				throw new Error('should have thrown')
			} catch(e) {
				e.should.be.an.instanceof(Errors.ValidationError)
			}

			try {
				schema.validate({ name:'Maximilienne' })
				throw new Error('should have thrown')
			} catch(e) {
				e.should.be.an.instanceof(Errors.ValidationError)
			}
		})
	})

	describe('.discriminate()', function() {
		it('should be tested')
	})
	
	describe('.clone()', function() {
		it('should be tested')
	})
	
	describe('.extend()', function() {
		it('should be tested')
	})

	describe('.only()', function() {
		it('should be tested')
	})

})