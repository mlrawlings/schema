var util = require('./util')

exports.pattern = function(input, key, def) {
	var pattern = input, error_msg
	
	
	if(util.isArray(pattern) && pattern.length == 2) {
		pattern = input[0]
		error_msg = input[1]
	}

	if(def.type !== String) throw new Error('Pattern only apply to Strings')
	if(!util.typeMatch(pattern, RegExp)) throw new Error('Pattern must be a RegExp')
	
	return function(val, obj, prop, name) {
		if(!pattern.test(val)) 
			throw new Error(error_msg || name + ' does not match the requested format.')
	}
}

exports.min = function(min, key, def) {
	if(!util.typeMatch(min, Number)) 
		throw new Error('Min must be a Number')
	
	if(def.type === String)
		return function(val, obj, prop, name) {
			if(val.length < min) throw new Error(name + ' is shorter than '+min+' chars.')
		}
	
	if(def.type === Number)
		return function(val, obj, prop, name) {
			if(val < min) throw new Error(name + ' is less than '+min+'.')
		}
	
	throw new Error('Min only applies to Numbers and Strings.')	
}

exports.max = function(max, key, def) {
	if(!util.typeMatch(max, Number)) 
		throw new Error('Max must be a Number')
	
	if(def.type === String)
		return function(val, obj, prop, name) {
			if(val.length > max) throw new Error(name + ' is longer than '+max+' chars.')
		}
	
	if(def.type === Number)
		return function(val, obj, prop, name) {
			if(val > max) throw new Error(name + ' is greater than '+max+'.')
		}
	
	throw new Error('Max only applies to Numbers and Strings.')
}

exports.step = function(step, key, def) {
	if(!util.typeMatch(step, Number)) 
		throw new Error('Step must be a Number')
	
	if(def.type !== Number)
		throw new Error('Step only applies to Numbers.')
	
	return function(val, obj, prop, name) {
		if(!Number.isInteger(val/step)) throw new Error(name + ' is not a multiple of ' + step + '.')
	}
}