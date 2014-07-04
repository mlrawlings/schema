var should = require('should')
  , sinon = require('sinon')
  , Schema = require('../lib/schema')

describe('Schema#new()', function() {
	it('should handle shorthand type notation', function() {
		var schema = new Schema({ test:String })
		schema.definition.test.type.should.equal(String)
	})
	it('should handle shorthand object notation', function() {
		var schema = new Schema({ test:{ a:String } })
		schema.definition.test.schema.should.be.an.instanceof(Schema)
	})
	it('should handle shorthand arrays')
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
		(function() {
			var schema = new Schema({ test:{ type:String, default:1 } })
		}).should.throw(/default/i)
	})
	it('should call validator parameter functions and add them to key\'s validators', function() {
		var fake, schema, def = { num:{ type:Number, fake_max:4 } }
		
		fake = sinon.spy()
		Schema.validators.fake_max = sinon.stub().returns(fake)
		schema = new Schema(def)

		Schema.validators.fake_max.calledWith(4, 'num', def.num).should.be.true
		schema.definition.num.validators[0].should.equal(fake)
	})
})

describe('Schema#validateField()', function() {
	var schema = new Schema({ 
		name:String, 
		age:Number, 
		birthday:Date, 
		address:{ 
			street:String, 
			zip:String 
		} 
	})

	it('should validate type', function() {
		schema.validateField({ name:'Michael' }, 'name').result.should.equal(true)
		schema.validateField({ name:1 }, 'name').result.should.equal(false)
	})
	it('should coerce type', function() {
		var data = { birthday:'1990-06-09', age:'10' }
		schema.validateField(data, 'birthday').result.should.equal(true)
		data.birthday.should.be.an.instanceof(Date)
		schema.validateField(data, 'age').result.should.equal(true)
		data.age.should.be.an.instanceof(Number)
	})
	it('should not allow keys not defined in the schema', function() {
		schema.validateField({ i_dont_exist:1 }, 'i_dont_exist').result.should.equal(false)
	})
	it('should call validators')
})

describe('Schema#validate()', function() {
	var schema = new Schema({ 
		name:String, 
		age:Number, 
		birthday:Date, 
		address:{ 
			street:String, 
			zip:String 
		} 
	})
	
	it('should validate types', function() {
		schema.validate({ name:'Michael', age:24, birthday:new Date('1990-06-09')}).result.should.equal(true)
		schema.validate({ name:'Michael', age:'abc', birthday:new Date('1990-06-09')}).result.should.equal(false)
	})

	it('should return all errors', function() {
		schema.validate({ name:123, age:'abc' }).errors.length.should.equal(2)
	})
})