# Schema.js

## <a name="define"></a> Defining a Schema

*Condensed Syntax*

```javascript
var schema = new Schema({
    name:String,
    age:Number,
    phones:[{ number:String, mobile:Boolean }]
})
```

*Explicit Syntax*

```javascript
var person = new Schema({
    name:{ type:String },
    age: { type:Number },
    phones:{ 
        type:Array, 
        items: { 
            type:Object, 
            schema:new Schema({ number:String, mobile:Boolean }) //note: subschema is in condensed syntax
        }
    }
})
```

These two syntaxes may be mixed within the same schema definition.  The expanded syntax is required to specify additional [properties](#properties) (instead of just types, array items, and object schemas) for a field.

## <a name="properties"></a> Field Properties

### Example

```javascript
new Schema({
    name: {
        first: { type:String, name:'First Name', required:true },
        last: { type:String, name:'Last Name', required:true }
    },
    age: { type:Number, default:18 }
})
```

### Built-in Properties  

**key** `String` *read-only*  
The key of the field. (eg. in the example above, the key for the person's first name would be `first`). 

**path** `String` *read-only*  
The path to the field. (eg. in the example above, the path for the person's first name would be `name.first`). 

**name** `String`  
The pretty/human-readable name of the field.  
Will be generated in Title Case automatically from the key if this property is not specified

**use** `Function`  
Field level plugins.  The plugin must match the function signature `function(field)` where field is the expanded field definition.  The plugin can then define additional field properties.  Plugins can "inherit" from another plugin by redefining field.use to another plugin function.

**type** `Function|Array`  
The constructor function for the type of the value.  May use javascript types or other constructor functions (`String`, `Number`, `Date`, `bson.ObjectID`, `Schema`, etc.) or an Array of constructor functions. May use the predefined type `Schema.Types.Any` which disables typechecking on the field. 

**default** `Schema.Types.Any`  
The default value for a field if no value is specfied.
The type of the default value must match the above **type**.

**required** `Boolean|Function`  
A Boolean or a Function that returns a Boolean indicating whether a value is required for this field.

**schema** `Schema`  
Required if **type** is Object.  Enforces the schema on the subkeys of this field.

**items** `Object`  
Required if **type** is Array.  Enforces the schema on all elements of the Array.

**validators** `Array`  
Array of custom validators. Validators must be functions matching the signature `function(value, field)`. A validator should `throw` if it fails, otherwise return.

### Custom Properties
The schema for a field is [dynamic](#options), meaning you can put any other properties into the field that are not defined above.  These properties can then be used by plugins and custom types.

## Validating an Object

```javascript
var schema = new Schema({ name:String, age:Number })

schema.validate({ name:'John Doe', age:27 })
//returns { result:true }

schema.validate({ name:'John Doe', age:'old' })
//returns { result:false, errors:[new Error('Age is invalid. "old" is not a Number')] }

schema.validateField({ name:'Jane Doe', age:'young' }, 'name')
//returns { result:true }

schema.validateField({ name:'Jane Doe', age:'young' }, 'age')
//returns { result:false, error:new Error('Age is invalid. "young" is not a Number') }
```

## Coercers

Types are automatically coerced into their defined types when possible.  This is done by passing the given value to the constructor for the defined type.  By default, only string values are passed.

```javascript
var data = { count:'10', when:'2014-01-01' }
  , schema = new Schema({ count:Number, when:Date })
  
schema.validate(data)
console.log(data)
//output: { count:10, when:2014-01-01T00:00:00.000Z }
```

You may also specify custom coercion functions on `Schema.coercers`.  This is an object in which each key is a construtor function, and each value is a coercion function matching the function signature `function(value)`.  The coercion function returns the coerced value or throws an error if it cannot coerce the value. 

## Plugins

### <a name="class-plugins"></a> Class plugins

### <a name="instance-plugins"></a> Instance plugins

### <a name="field-plugins"></a> Field plugins

## API

###`new Schema(definition[, options])`

**definition**  
An object defining fields to be added to the schema.  See [Defining a Schema](#define) and [Field Properties](#properties).

<a name="options"></a> **options**  
An optional object where you can set the following properties:

- `dynamic`  
When true, keys not defined in the schema will be ignored, rather than throwing a validation error.  default = false.

### `Schema.Types`

This object, by default, only contains **Schema.Types.Any** by default.  Plugins may add additional types to this object to allow users access to them when defining their schemas.

**Schema.Types.Any**  
a special type that disables typechecking on a field.

### `Schema.use(plugin[, options])`
See [Class Plugins](#class-plugins).

**plugin**  
A Schema Class plugin matching the function signature `function(Schema, options)`.  The plugin is passed the Schema constructor so that it can modify the prototype, add Types, etc. 

**options**  
An optional object that will be passed to the plugin.  What options are available, if any, will depend on the plugin.

### `schema.use(plugin[, options])` 
See [Instance Plugins](#instance-plugins).

**plugin**  
A schema instance plugin matching the function signature `function(schema, options)`.  The plugin is passed the schema instance so that it can add fields, discriminators, etc. 

**options**  
An optional object that will be passed to the plugin.  What options are available, if any, will depend on the plugin.

### `schema.add(definition)`

**definition**  
An object defining fields to be added to the schema.  See [Defining a Schema](#define) and [Field Properties](#properties).

### `schema.discriminate(query, definition)`

**query**  
An object defining a [MongoDB-like query](http://docs.mongodb.org/manual/reference/operator/query/).  Powered by [sift](https://github.com/crcn/sift.js). Supports the following operators: $in, $nin, $exists, $gte, $gt, $lte, $lt, $eq, $neq, $mod, $all, $and, $or, $nor, $not, $size, $type, $regex.  

**definition**  
An object defining fields to be added to the schema.  See [Defining a Schema](#define) and [Field Properties](#properties).

#### Example

`schema.discriminate()` allows you to modify the schema based on the values of the object that you are validating.  For example, we can require a credit card number and cvv, but only if the purchase is being made by credit card.
```javascript
var purchase = new Schema({ amount:Number, payment:String })
purchase.descriminate({ payment:'credit' }, { 
    card:{ 
        number: { type:Number, required:true },
        cvv: { type:Number, required:true }
    }
})
purchase.descriminate({ payment:'check' }, { 
    check:{ 
        account: { type:Number, required:true },
        routing: { type:Number, required:true }
    }
})

purchase.validate({ amount:10.00, payment:'credit' })
// errors because card.number and card.cvv are required

purchase.validate({ amount:10.00, payment:'cash', card: { number:4716740357239704 })
// errors because card.number is not present in the base schema

purchase.validate({ amount:10.00, payment:'check', check:{ account:9900000003, routing:321174851 })
// looks good

```

discriminate on type:
```javascript
var schema = new Schema({ result:[Boolean|Function] })
schema.descriminate({ result:{ $type:Boolean } }, {
    additional:Number
})
```
discriminate on comparisons:
```javascript
var purchase = new Schema({ amount:Number })
purchase.descriminate({ amount:{ $gt:0 } }, {
    payment: { type:String, required:true }
})
```

##### Allow discrimnated field modification?
```javascript
var person = new Schema({ 
    name: { 
        first:String, 
        middle:String, 
        last: { type:String, required:true } 
    }
})

person.descriminate({ 'name.middle': { $exists:false } }), {
    'name.first': { required:true }
})
```

### `schema.clone()`

### `schema.extend(definition)`

### `schema.only(fields)`