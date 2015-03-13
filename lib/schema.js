var clone = require('clone')
  , filtr = require('filtr')
  , util = require('./util')
  , merger = require('./merger')
  , extend = merger({ inPlace:true, deep:true, array:'concat', priority:'right' })
  , defaults = merger({ inPlace:true, deep:true, array:'replace', priority:'left' })
  , JSONPrimitives = [String, Number, Boolean]
  , ValidationError = require('common-errors').ValidationError

function Schema(definition) {
	Object.defineProperty(this, 'registeredTypes', {
		  value:{}
		, writable:true
		, configurable:true
	})
	definition && this.extend(definition)
}

Schema.prototype.extend = function(definition) {
	extend(this, this.expandDefinition(definition))
	return this
}

Schema.prototype.extendWhen = function(query, definition) {
	this.when = this.when || []
	this.when.push({ query:filtr(query), definition:this.expandDefinition(definition) })
	return this
}

Schema.prototype.getActiveSchema = function(data) {
	var schema = this
	  , resultingSchema

	if(!schema.when || !schema.when.length) return schema

	schema.when.forEach(function(when) {
		if(when.query.test(data, { type:'single' })) {
			resultingSchema = resultingSchema || clone(schema)
			extend(resultingSchema, when.definition)
		}
	})

	return resultingSchema || schema
}

Schema.prototype.applyDefaults = function(data, options, schema) {
	schema = schema || this.getActiveSchema(data)

	if(schema.default === undefined)
		return data

	if(data === undefined) {
		return schema.default
	}
	
	if(util.isObject(data) && schema.type === Object) {
		return defaults(data, schema.default)
	}

	if(util.isArray(data) && schema.type === Array) {
		return data.map(function(item) {
			return Schema.prototype.applyDefaults(item, options, schema.items)
		})
	}
	
	return data
}

Schema.prototype.validate = function(data, options, schema) {
	var errors = new ValidationError()

	schema = schema || this.getActiveSchema(data)
	options = options || {}

	if(!util.isExistent(data)) {
		if(schema.required) throw new ValidationError('required')
		else return true
	}

	if(!util.typeMatch(data, schema.type)) {
		throw new ValidationError('expected '+schema.type.name)
	}

	if(util.isObject(data)) {
		Object.keys(data).forEach(function(key) {
			try {
				Schema.prototype.validate(data[key], options, schema.properties[key])
			} catch(e) {
				errors.addError(e)
			}
		})
		schema.required && schema.required.forEach(function(key) {
			if(!util.isExistent(data[key]))
				errors.addError(new ValidationError('required'))
		})
	}

	if(util.isArray(data)) {
		data.forEach(function(item) {
			try{
				Schema.prototype.validate(item, options, schema.items)
			} catch(e) {
				errors.addError(e)
			}
		})
	}

	if(schema.validators) {
		schema.validators.forEach(function(validator) {
			try {
				validator(data)
			} catch(e) {
				errors.addError(e)
			}
		})
	}

	if(errors.errors) throw errors
	else return true
}

Schema.prototype.expandDefinition = function(definition) {
	var schema = this
	  , required

	if(util.isFunction(definition)) {
		definition = { type:definition }
	}
	else if(util.isArray(definition) && definition.length > 1) {
		definition = { type:definition }
	}
	else if(util.isArray(definition)) {
		definition = { type:Array, items:definition[0] }
	}
	else if(util.isObject(definition) && !definition.type) {
		definition = { type:Object, properties:definition }
	}

	if(definition.type === Object) {
		required = []
		Object.keys(definition.properties).forEach(function(key) {
			if(!util.is(definition.properties[key], Schema)) {
				definition.properties[key] = schema.expandDefinition(definition.properties[key])
			} else {
				schema.registerTypes(definition.properties[key].registerTypes)
			}
			if(definition.properties[key].default !== undefined) {
				definition.default = definition.default || {}
				definition.default[key] = definition.properties[key].default
			}
			if(definition.properties[key].required) {
				required.push(key)
			}
		})
		if(required.length) {
			definition.required = definition.required === undefined ? required : definition.required
		}
	}

	if(definition.type === Array) {
		if(!util.is(definition.items, Schema)) {
			definition.items = schema.expandDefinition(definition.items)
		} else {
			schema.registerTypes(definition.items.registerTypes)
		}
	}

	if(Schema.schema) Schema.schema.validate(definition)

	if(util.isArray(definition.type)) {
		definition.type.forEach(function(type) {
			schema.registerType(type)
		})
	} else {
		schema.registerType(definition.type)
	}

	return definition
}

Schema.prototype.registerTypes = function(types) {
	var schema = this
	types && Object.keys(types).forEach(function(name) {
		schema.registerType(types[name])
	})
}

Schema.prototype.registerType = function(Type) {
	var types = this.registeredTypes
	  , name = Type.name
	
	if(types[name] && types[name] != Type)
		throw new Error('A type named "'+name+'" has already been registerd')
	
	types[name] = Type
}

Schema.prototype.stringify = function(data) {
	var types = this.registeredTypes
	return JSON.stringify(util.traverse(function(value, key) {
		var name
		  , result

		if(value == null || value == undefined) return value
		if(util.isAny(value, JSONPrimitives)) return value
		
		name = value.constructor.name

		if(types[name] != value.constructor) 
			throw new Error('Unrecognized type: '+value.constructor)

		result = {}
		result['$$_'+name] = value.toJSON()
		return result
	}, data))
}

Schema.prototype.parse = function(string) {
	var types = this.registeredTypes
	return util.traverse(function(value, key) {
		var Type
		  , name
		  , keys = Object.keys(value)

		if(keys.length == 1 && keys[0].indexOf('$$_') == 0) {
			name = keys[0].slice(3)

			if(Type = types[name])
				if(util.isFunction(Type.fromJSON))
					return Type.fromJSON(value)
				else
					return new Type(value)
			
			throw new Error('Unrecognized type: '+name)
		}
		
		return value
	}, JSON.parse(string))
}

/*Schema.schema = new Schema({
	  type:Object
	, properties: {
		  type:[Function, Array]
		, required:Boolean
		, validators:[Function]
		, default:null
	  }
	, validators:[function(schema){ 
		if(!util.typeMatch(schema.default, schema.type)) 
			throw new Error('default value must match type') 
	  }]
	, required:['type']
})
Schema.schema.extendWhen({ type:Array }, { 
	  type:Object
	, properties: {
		  items:Schema.schema
		, loose:Boolean
		, required:[String]
	  }
	, required:['items']
})
Schema.schema.extendWhen({ type:Object }, { 
	  type:Object
	, properties: {
		  properties: {
		  	  type:Object
		  	, properties:{}
		  	, loose:true
		  	, validators: [function(props){ 
		  		Object.keys(props).forEach(function(key){ 
		  			Schema.schema.validate(props[key]) 
		  		}) 
		  	  }]
		  }
		, loose:Boolean
		, required:[String]
	  }
	, required:['properties']
})*/

Schema.ValidationError = ValidationError

module.exports = Schema