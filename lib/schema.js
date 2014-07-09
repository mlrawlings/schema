var util = require('./util')

var Schema = module.exports = function(definition, options) {
	this.definition = {}
	this.options = options || {}
	this.required = []
	this.properties = {}
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
		Object.keys(schema.definition[key]).forEach(function(prop) {
			schema.properties[prop] = schema.properties[prop] || {}
			schema.properties[prop][key] = schema.definition[key][prop]
		})
		if(schema.definition[key].schema) Object.keys(schema.definition[key].schema.properties).forEach(function(prop) {
			schema.properties[prop] = schema.properties[prop] || {}
			schema.properties[prop]['_'] = {}
			schema.properties[prop]['_'][key] = {}
			Object.keys(schema.definition[key].schema.properties[prop]).forEach(function(sub_key) {
				schema.properties[prop]['_'][key][sub_key] = schema.definition[key].schema.properties[prop][sub_key]
			})
		})
	})
}

Schema.prototype.validate = function(object, strict_mode) {
	var schema = this
	  , errors = []
	  , undefined
	  , field
	
	Object.keys(object).forEach(function(key) {
		field = schema.validateField(object, key, strict_mode)
		if(!field.result) errors.push(field.error)
	})

	this.applyDefaults(object)
	
	// TODO: required
	

	return { result:errors.length == 0, errors:errors }
}

Schema.prototype.applyDefaults = function(object, strict_mode) {
	var schema = this

	if(schema.properties.default) {
		Object.keys(schema.properties.default).forEach(function(key) {
			if(key != '_' && !util.isExistent(object[key]))
				object[key] = schema.properties.default[key]
		})
		// TODO: make sure it's not possible to have an infinite recursive loop when dealing with circular schemas
		if(schema.properties.schema && schema.properties.default._) Object.keys(schema.properties.schema).forEach(function(key) {
			if(key != '_' && !util.isExistent(object[key]) && schema.properties.default._[key]) {
				object[key] = {}
				schema.properties.schema[key].applyDefaults(object[key])
			}
		})
	}
}

Schema.prototype.validateField = function(object, key, strict_mode, definition) {
	var keys

	if(!definition) {
		keys = key.split('.')
		key = keys.splice(0,1)[0]
		keys = keys.join('.')
		definition = this.definition[key]
	}

	if(!definition)  {
		if(this.options.allow_undefined_keys)
			return { result:true }
		else
			return { result:false, error:new Error(key + ' is not in the schema.') }	
	}

	if(!util.isExistent(object[key])) {
		if(util.isExistent(definition.default)) {
			object[key] = definition.default
		}
	}

	try {
		if(definition.type != Schema.AnyType)
			object[key] = coerceType(object[key], definition.type)
	} catch(e) {
		return { result:false, error:new Error('Expected ' + definition.name + ' to be a ' + definition.type.name + '.') }
	}

	if(definition.type == Array) {
		for(var i = 0; i < object[key].length; i++) {
			var result = this.validateField(object[key], i, strict_mode, definition.items)
			if(!result.result) return result
		}
	}

	if(definition.type == Object) {
		if(keys)
			return definition.schema.validateField(object[key], keys, strict_mode)
		else
			return definition.schema.validate(object[key], strict_mode)
	}

	try {
		if(definition.validators) definition.validators.forEach(function(validator) {
			var new_value = validator(object[key], object, key, definition.name)
			if(util.isExistent(new_value)) object[key] = new_value
		})
	} catch(e) {
		return { result:false, error:e }
	}

	return { result:true }
}

Schema.schema = new Schema({
	name: String,
	type: [Function, Array],
	required: [Boolean, Function],
	validators: [Function]
})
Schema.schema.add({
	default: { type:Schema.AnyType, validators:[function(val, obj, prop, name) {
		if(!util.typeMatch(val, obj.type)) 
			throw new Error(prop + ' is invalid. Default value must match type.' +  (obj.type.name ? ' ' + JSON.stringify(val) + ' is not a ' + obj.type.name : ''))
	}] }
})
Schema.schema.add({
	schema: { type:Schema, required:function ifObject(val, obj, prop, name){
		if(obj.type == Object && !val) throw new Error('Schema is required for objects')
	} },
	items: { type:Object, schema:Schema.schema, required:function ifArray(val, obj, prop, name){
		if(obj.type == Array && !val) throw new Error('Items is required for arrays')
	} }
})

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

	if(value.schema && value.schema.constructor != Schema)
		try { value.schema = new Schema(value.schema) } 
		catch(e) { throw new Error(key+'.'+e.message) }

	if(value.items) {
		try { value.items = parseDefinition(value.items, key+'[]') }
		catch(e) { throw new Error(e.message) }
	}
	Object.keys(value).forEach(function(prop) {
		if(Schema.validators[prop]) {
			value.validators = value.validators || []
			value.validators.push(Schema.validators[prop](value[prop], key, value))
			// TODO: remove this. add validators to schema.
			delete value[prop]
		}
	})

	if(Schema.schema) {
		var result = Schema.schema.validate(value)
		if(!result.result) {
			throw result.errors[0]
		}
	}

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