exports[Boolean] = function(value) {
	if(value == 1) return true
	if(value == 0) return false
	if(value == 'on') return true
	if(value == 'off') return false
	if(value == 'true') return true
	if(value == 'false') return false
	throw new Error('Could not coerce')
}