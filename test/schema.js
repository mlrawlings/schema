var should = require('should')
  , ValidationError = require('common-errors').ValidationError
  , Schema = require('../lib/schema')

describe('Schema', function() {
	describe('new/expandDefinition()', function() {
		it('should expand shorthand type notation', function() {
			new Schema(String).should.eql({ type:String })
		})
		it('should expand shorthand object notation', function() {
			new Schema({ name:String }).should.eql({ 
				  type:Object
				, properties: {
					name: { type:String }
				  }
			})
		})
		it('should expand shorthand array notation', function() {
			new Schema([String]).should.eql({ 
				  type:Array
				, items: { type:String }
			})
		})
		it('should allow multiple types', function() {
			new Schema([String, Number]).should.eql({ 
				  type:[String, Number]
			})
		})
		it('should pull up nested requires', function() {
			new Schema({ name:{ type:String, required:true }}).should.eql({ 
				  type:Object
				, properties: {
					name: { type:String, required:true }
				  }
				, required: ['name']
			})
		})
		it('should not, however, touch an already defined required', function() {
			new Schema({
				  type:Object
				, properties: {
					name: { type:String, required:true }
				  }
				, required: []
			}).should.eql({ 
				  type:Object
				, properties: {
					name: { type:String, required:true }
				  }
				, required: []
			})
		})
		it('should pull up nested defaults', function() {
			new Schema({ name:{ type:String, default:'Michael' }}).should.eql({ 
				  type:Object
				, properties: {
					name: { type:String, default:'Michael' }
				  }
				, default: { name:'Michael' }
			})
		})
		it('should also merge defaults into an already defined default', function() {
			new Schema({
				  type:Object
				, properties: {
					  name: { type:String, default:'Michael' }
					, age: Number
				  }
				, default: { age:18 }
			}).should.eql({ 
				  type:Object
				, properties: {
					  name: { type:String, default:'Michael' }
					, age: { type:Number }
				  }
				, default: { age:18, name:'Michael' }
			})
		})
	})
	describe('extend()', function() {
		it('should extend the existing schema', function() {
			new Schema({ name:String }).extend({ age:Number }).should.eql({
				  type:Object
				, properties: {
					  name: { type:String }
					, age: { type:Number }
				  }
			})
		})
		it('should merge required arrays', function() {
			new Schema({ name:{ type:String, required:true } }).extend({ age:{ type:Number, required:true } }).should.eql({
				  type:Object
				, properties: {
					  name: { type:String, required:true }
					, age: { type:Number, required:true }
				  }
				, required:['name', 'age']
			})
		})
	})
	describe('extendWhen()', function() {
		it('should add a `when` entry to the schema', function() {
			var schema = new Schema({ age:Number }).extendWhen({ age:{ $gt:16 } }, { license:String })

			schema.when.length.should.equal(1)
			schema.when[0].test.should.be.instanceof(Function)
			schema.when[0].definition.should.eql({
				  type:Object
				, properties: {
					  license: { type:String }
				  }
			})
		})
	})
	describe('getActiveDefinition()', function() {
		it('should return the applicable schema', function() {
			var schema = new Schema({ age:Number }).extendWhen({ age:{ $gt:16 } }, { license:String })
			  , active = schema.getActiveDefinition({ age:18 })

			active.type.should.equal(Object)
			active.properties.should.eql({
				  age: { type:Number }
				, license: { type:String }
			})
		})
		it('should not modify the original schema', function() {
			var schema = new Schema({ age:Number }).extendWhen({ age:{ $gt:16 } }, { license:String })
			  , originalString = JSON.stringify(schema)

			schema.getActiveDefinition({ age:18 })

			originalString.should.equal(JSON.stringify(schema))
		})
	})
	describe('applyDefaults()', function() {

	})
	describe('validate()', function() {
		it('should return true when the value conforms to the schema', function() {
			var schema = new Schema(String)
			schema.validate('hello').should.be.true
		})
		it('should throw when the value does not conform', function() {
			var schema = new Schema(String)

			try {
				schema.validate(123)
				throw new Error('Did not throw')
			} catch(e) {
				e.should.be.instanceof(ValidationError)
			}
		})
		it('should allow undefined/null when a value is not required', function() {
			var schema = new Schema(String)
			schema.validate().should.be.true
			schema.validate(null).should.be.true
		})
		it('should throw on undefined/null when a value is required', function() {
			var schema = new Schema({ type:String, required:true })
			try {
				schema.validate(null)
				throw new Error('Did not throw')
			} catch(e) {
				e.should.be.instanceof(ValidationError)
			}
		})
		it('should check values against validators', function() {
			var schema = new Schema({ type:Number, validators:[min(18)] })
			
			try {
				schema.validate(16)
				throw new Error('Did not throw')
			} catch(e) {
				e.should.be.instanceof(ValidationError)
			}

			schema.validate(21).should.be.true

			function min(min) {
				return function(value) {
					if(value < min)
						throw new ValidationError('must be '+min+' or greater')
				}
			}
		})
		it('should validate objects', function() {
			var schema = new Schema({
				  name:String
				, age:Number
			})
			try {
				schema.validate({ name:'Michael', age:'hi' })
				throw new Error('Did not throw')
			} catch(e) {
				e.should.be.instanceof(ValidationError)
			}

			schema.validate({ name:'Anna', age:21 }).should.be.true
		})
		it('should validate arrays', function() {
			var schema = new Schema([String])

			try {
				schema.validate(['hi', 'there', 1])
				throw new Error('Did not throw')
			} catch(e) {
				e.should.be.instanceof(ValidationError)
			}

			schema.validate(['a', 'b', 'c']).should.be.true
		})
		it('should not allow keys not defined in the schema', function() {
			var schema = new Schema({
				name:String
			})

			try {
				schema.validate({ name:'Anna', age:21 })
				throw new Error('Did not throw')
			} catch(e) {
				e.should.be.instanceof(ValidationError)
			}
		})
		it('should allow a compound field to be optional, but require all parts if partially filled out', function() {
			var schema = new Schema({
				  type:Object
				, properties: {
				  	  name:String
				  	, address:{
				  		  street:{ type:String, required:true }
				  		, city:{ type:String, required:true }
				  		, state:{ type:String, required:true }
				  		, zip:{ type:String, required:true }
				  	  }
				  }
				, required:['name']
			})

			try {
				schema.validate({ name:'Anna', address:{ zip:24014 } })
				throw new Error('Did not throw')
			} catch(e) {
				e.should.be.instanceof(ValidationError)
			}

			schema.validate({ name:'Anna' }).should.be.true
		})
		it('should validate when type is an array', function() {
			var schema = new Schema([String, Number])

			try {
				schema.validate(true)
				throw new Error('Did not throw')
			} catch(e) {
				e.should.be.instanceof(ValidationError)
			}

			schema.validate(1).should.be.true
			schema.validate('hi').should.be.true
		})
		it('should validate conditional schemas', function() {
			var schema = new Schema({ age:Number }).extendWhen({ age:{ $gt:16 } }, { license:{ type:String, required:true } })

			schema.validate({ age:14 }).should.be.true
			schema.validate({ age:18, license:'A984327985' }).should.be.true

			try {
				schema.validate({ age:12, license:'A984327985' })
				throw new Error('Should have been too young to have a license')
			} catch(e) {
				e.should.be.instanceof(ValidationError)
			}

			try {
				schema.validate({ age:21 })
				throw new Error('License should be required if over 16')
			} catch(e) {
				e.should.be.instanceof(ValidationError)
			}
		})
	})
	describe('stringify() & parse()', function() {
		function Type(a) {
			this.a = a
		}
		Type.prototype.toJSON = function() {
			return this.a
		}
		it('should stringify custom types and be able to parse them back', function() {
			var schema = new Schema(Type)
			  , string = schema.stringify(new Type(1))

			string.should.be.instanceof(String)
			schema.parse(string).should.be.instanceof(Type)
		})
	})
})