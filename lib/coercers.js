exports[Boolean] = function(value) {
	if(value == 1) return true
	if(value == 0) return false
	if(value.toLowerCase() == 'on') return true
	if(value.toLowerCase() == 'off') return false
	if(value.toLowerCase() == 'true') return true
	if(value.toLowerCase() == 'false') return false
	throw new Error('Could not coerce')
}

exports[Date] = function(value) {
	var date = new Date(value)
	if(isNaN(date)) throw new Error('Could not coerce')
	return date
}

exports[Function] = function(value) {
	throw new Error('Could not coerce')
}