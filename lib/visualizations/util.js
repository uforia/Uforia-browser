
//Utility functions
module.exports = {
  //Returns a default value for undefined values
  defaultFor: function(arg, val) { 
    return typeof arg !== 'undefined' ? arg : val; 
  },

  // Function: createNestedObject( base, names[, value] )
  //   base: the object on which to create the hierarchy
  //   names: an array of strings contaning the names of the objects
  //   value (optional): if given, will be the last object in the hierarchy
  // Returns: the last object in the hierarchy
  createNestedObject: function( base, names, value ) {
      // If a value is given, remove the last name and keep it for later:
      var lastName = arguments.length === 3 ? names.pop() : false;

      // Walk the hierarchy, creating new objects where needed.
      // If the lastName was removed, then the last object is not set yet:
      for( var i = 0; i < names.length; i++ ) {
          base = base[ names[i] ] = base[ names[i] ] || {};
      }

      // If a value was given, set it to the last name:
      if( lastName ) base = base[ lastName ] = value;

      // Return the last object in the hierarchy:
      return base;
  },
  getEmailFromInput: function(input){
    if(typeof input === 'number'){
      return [input];
    }
    if(input === null || (input && input.toLowerCase() == 'null') || typeof input == 'undefined' || (input && input.length == 0)){
      return [];
    }

    if(input){
      input = input.toLowerCase();

      // check for Email
      var matches = input.match(/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/gi);
      if(matches && matches.length > 0){
        return matches;
      }
    }
    var split = input.replace(/(<\/.*?\>,?)/g, '@@').split('@@');
    if(split.length > 1){
      return split;
    }
    if(input.split(',').length > 1){
      return input.split(',');
    }
    return [input];
  }
}