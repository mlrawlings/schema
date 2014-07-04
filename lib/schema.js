var util = require('./util')

var Schema = module.exports = function(definition, options) {
	this.definition = {}
	this.options = options || {}
	this.required = []
	this.add(definition)
}

Schema.name = 'Schema'
Schema.validators = require('./validators')
Schema.coercers = require('./coercers')
Schema.AnyType = function() {}

Schema.prototype.add = function(definition) {
	var schema = this
	Object.keys(definition).forEach(function(key) {
		schema.definition[key] = parseDefinition(definition[key], key)
		if(schema.definition[key].required) schema.required.push(key)
		if(schema.definition[key].schema) schema.definition[key].schema.required.forEach(function(sub_key) {
			schema.required.push(key+sub_key)
		})
	})
}

Schema.prototype.validate = function(object, strict_mode) {
	var schema = this
	  , errors = []
	  , field
	Object.keys(object).forEach(function(key) {
		field = schema.validateField(object, key, strict_mode)
		if(!field.result) errors.push(field.error)
	})
	return { result:errors.length == 0, errors:errors }
}

Schema.prototype.validateField = function(object, key, strict_mode) {
	var definition = this.definition[key]
	
	if(!definition) 
		if(this.options.allow_undefined_keys)
			return { result:true }
		else
			return { result:false, error:new Error(key + ' is not in the schema.') }	

	// TODO: apply defaults

	try{
		if(definition.type != Schema.AnyType)
			object[key] = coerceType(object[key], definition.type, Schema.coercers)
	} catch(e) {
		return { result:false, error:new Error('Expected ' + definition.name + ' to be a ' + definition.type.name + '.') }
	}

	// TODO: run validators


	return { result:true }
}

function parseDefinition(value, key) {
	if(util.isArray(value) && value.length == 1)
		value = { type:Array, items:value[0] }
	else if(util.isObject(value) && !value.type)
		value = { type:Object, schema:value }
	else if(!util.isObject(value))
		value = { type:value }

	if(!value.name)
		value.name = util.titleCase(key)

	if(!util.isValidType(value.type))
		throw new Error(key + ' is invalid. Type must be a constructor function.')

	if(util.isExistent(value.default) && !util.typeMatch(value.default, value.type))
		throw new Error(key + ' is invalid. Default value must match type.' +  (value.type.name ? ' ' + JSON.stringify(value.default) + ' is not a ' + value.type.name : ''))

	if(value.schema && value.schema.constructor != Schema)
		try { value.schema = new Schema(value.schema) } 
		catch(e) { throw new Error(key+'.'+e.message) }

	if(value.items)
		try { value.items = parseDefinition(value.items, '[]') }
		catch(e) { throw new Error(key+e.message) }

	Object.keys(value).forEach(function(prop) {
		if(Schema.validators[prop]) {
			value.validators = value.validators || []
			value.validators.push(Schema.validators[prop](value[prop], key, value))
			delete value[prop]
		}
	})

	// TODO: validate value against schema's schema

	return value
}

function coerceType(instance, constructor) {
	if(util.typeMatch(instance, constructor)) return instance

	if(util.isArray(constructor)) {
		for(var i = 0; i < constructor.length; i++) {
			try{ return coerceType(instance, constructor[i]) }
			catch(e) { if(i+1 == constructor.length) throw e }
		}
	}

	if(Schema.coercers[constructor]) {
		return Schema.coercers[constructor](instance)
	} else if(util.typeMatch(instance, String) && constructor != Array && constructor != Object) {
		var coerced = new constructor(instance)
		if(util.isExistent(coerced)) return coerced
	}

	throw new Error('Could not coerce')
}