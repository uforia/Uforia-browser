var module_data;

function init(){
    loadModules();

    //initialize draggable connected lists
    $( "#available_fields, #selected_fields" ).sortable({
      connectWith: ".connectedSortable"
    }).disableSelection();

    $("#create_mapping").click(function() {
  		sendMappingRequest();
	});
}

//request the available modules
function loadModules(){
    $.getJSON('api/get_mappings', function(data){ 
    	module_data = data;
	    $.each(data, function(idx, obj){
			$('#modules').append($('<option>', { value : obj.name }).text(obj.name)); 
	    });
	});
}

//updates the dragable lists
function changeModule(){
	var selectedValues = $('#modules').val();
	$('#available_fields').empty();
	$('#selected_fields').empty();
	$.each(module_data, function(idx, obj){
		if($.inArray(obj.name, selectedValues) !== -1){
			$.each(obj.fields, function(index, field){
				$('#available_fields').append('<li class="ui-state-default">' + field + '</li>');
			});
		}
	});
}

function sendMappingRequest(){

	if($('#mapping_name').val() == ''){
		alert("Enter a name for the mapping");
		return;
	} else if ($('#selected_fields li').length < 1){
		alert("Drag some field into the 'Mapping fields' list");
		return;
	}

	var request = {
		'name' : name,
		'fields' : [],
		'modules' : {},
                'visualization_type' : "NULL" 
	};

	request['name'] = $('#mapping_name').val();
        request['visualization_type'] = $('#visual_type').val();

	//Get the selected fields
	$("#selected_fields li").each(function() { request['fields'].push($(this).text()) });

	//get the modules
	var selectedValues = $('#modules').val();	
	$.each(module_data, function(idx, obj){
		if($.inArray(obj.name, selectedValues) !== -1){
			$.each(obj.modules, function(key, value){
				request.modules[key] = value;
			});
		}
	});

	var api_call = "api/create_mapping?";
	api_call += $.param(request);
	console.log(api_call);
	$.get(api_call, function(data){ 
		alert(data);
	});
}
